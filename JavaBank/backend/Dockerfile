# syntax=docker/dockerfile:1.7

# ─── JavaBank Backend - Optimized Multi-Stage Build ───

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /build
COPY pom.xml .

# Pre-fetch dependencies in a separate cacheable layer.
RUN --mount=type=cache,target=/root/.m2 mvn -DskipTests dependency:go-offline -q

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn package -DskipTests -q

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 5001

ENTRYPOINT ["java", "-jar", "app.jar"]
