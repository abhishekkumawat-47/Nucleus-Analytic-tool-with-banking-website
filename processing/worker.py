import sys
import os
import json
import logging
from confluent_kafka import Consumer, KafkaError, KafkaException
import time

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from storage.client import ch_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
BATCH_SIZE = 500
FLUSH_INTERVAL = 2.0  # seconds

def get_consumer():
    """Build and return a Kafka consumer."""
    conf = {
        'bootstrap.servers': settings.KAFKA_BROKER_URL,
        'group.id': 'feature-processor-group',
        'auto.offset.reset': 'earliest',
        'enable.auto.commit': False  # We commit manually after DB insert
    }
    return Consumer(conf)

def run_worker():
    """Main loop to consume from Kafka and write to ClickHouse."""
    consumer = get_consumer()
    consumer.subscribe([settings.KAFKA_TOPIC_EVENTS])
    
    logger.info("Worker started, waiting for events...")
    
    batch = []
    last_flush_time = time.time()
    
    try:
        while True:
            # Poll with a short timeout to allow flushing based on time
            msg = consumer.poll(timeout=1.0)
            
            if msg is not None:
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        # End of partition event
                        pass
                    else:
                        raise KafkaException(msg.error())
                else:
                    try:
                        event_data = json.loads(msg.value().decode('utf-8'))
                        batch.append(event_data)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to decode message: {e}")

            now = time.time()
            # Flush if batch limit is reached or time interval passed
            if len(batch) >= BATCH_SIZE or (now - last_flush_time >= FLUSH_INTERVAL and len(batch) > 0):
                logger.info(f"Flushing batch of {len(batch)} events to ClickHouse.")
                try:
                    ch_client.insert_events(batch)
                    consumer.commit(asynchronous=True)  # Commit offsets after successful insert
                    logger.debug("Committed offsets.")
                except Exception as e:
                    logger.error(f"Failed to insert batch: {e}. Retrying next loop.")
                    # For a production system we'd refine backoff/dead-letter queues here.
                    continue
                
                # Reset batch state
                batch.clear()
                last_flush_time = now

    except KeyboardInterrupt:
        logger.info("Worker gracefully shutting down...")
    except KafkaException as e:
        logger.critical(f"Kafka exception: {e}")
    finally:
        # Commit any stragglers if needed, though they aren't inserted. Best to let them be reprocessed.
        consumer.close()
        logger.info("Kafka consumer closed.")

if __name__ == "__main__":
    run_worker()
