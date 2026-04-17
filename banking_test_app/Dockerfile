# ═══ Stage 1: Build ═══
FROM gradle:8.7-jdk17 AS builder
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY src ./src
RUN gradle bootJar --no-daemon

# ═══ Stage 2: Run ═══
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /app/build/libs/banking-test-app.jar app.jar
EXPOSE 3000
ENTRYPOINT ["java", "-Djava.net.preferIPv6Addresses=true", "-jar", "app.jar"]
