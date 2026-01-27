FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /build

COPY pom.xml .
RUN mvn -q dependency:go-offline

COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=build /build/target/mock-ledger-service-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 9003

ENTRYPOINT ["java", "-jar", "app.jar"]

