# Use a minimal Java image
FROM openjdk:17-jdk-slim

# Set working directory
WORKDIR /app

# Copy the project files into the container
COPY . /app

# 🔧 Make mvnw executable
RUN chmod +x mvnw

# Build the project without running tests
RUN ./mvnw clean package -DskipTests

# Expose the port your Spring Boot app runs on
EXPOSE 8080

# Run the Spring Boot app
CMD ["java", "-jar", "target/email-writer-sb-0.0.1-SNAPSHOT.jar"]
