# Stage 1: Build the application using Maven and JDK 17
FROM maven:3.8.4-openjdk-17-slim AS build
WORKDIR /app

# Copy the pom.xml and source code into the container
COPY pom.xml .
COPY src ./src

# Compile and package the application into a JAR file, skipping test suites
RUN mvn clean package -DskipTests

# Stage 2: Create the lightweight, secure runtime image using an active, supported JDK
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the compiled JAR from the build stage into our runtime layer
COPY --from=build /app/target/*.jar app.jar

# Expose port 8080 (the default port for Tomcat)
EXPOSE 8080

# Run the Spring Boot application execution command
ENTRYPOINT ["java", "-jar", "app.jar"]