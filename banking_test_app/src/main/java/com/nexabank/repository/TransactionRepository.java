package com.nexabank.repository;

import com.nexabank.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findAllByOrderByTimestampDesc();
    List<Transaction> findByReceiverAccNo(String receiverAccNo);
    List<Transaction> findBySenderAccNo(String senderAccNo);

    @Query("SELECT t FROM Transaction t WHERE t.senderAccNo = :acc OR t.receiverAccNo = :acc ORDER BY t.timestamp DESC")
    List<Transaction> findByUserAcc(@Param("acc") String acc);

    @Query("SELECT t FROM Transaction t WHERE t.senderAccNo IN :accNos OR t.receiverAccNo IN :accNos ORDER BY t.timestamp DESC")
    List<Transaction> findByAccountNumbers(@Param("accNos") List<String> accNos);

    @Query("SELECT t FROM Transaction t WHERE (t.senderAccNo IN :accNos OR t.receiverAccNo IN :accNos) AND t.timestamp >= :since ORDER BY t.timestamp DESC")
    List<Transaction> findByAccountNumbersAndTimestampAfter(@Param("accNos") List<String> accNos, @Param("since") LocalDateTime since);
}
