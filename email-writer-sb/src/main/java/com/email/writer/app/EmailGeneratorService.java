package com.email.writer.app;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.List;
import java.util.Map;

@Service
public class EmailGeneratorService {

    private final WebClient webClient;
    private final Tika tika = new Tika();

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    public EmailGeneratorService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl("https://generativelanguage.googleapis.com").build();
    }

    public String generateEmailReply(EmailRequest emailRequest) {
        // Step 1: Handle text parsing for optional attachment
        String attachmentContext = extractAttachmentText(emailRequest.getAttachment());

        // Step 2: Build enhanced prompt containing the context
        String prompt = buildPrompt(emailRequest, attachmentContext);

        // Step 3: Construct the request payload structure for Google's API
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                )
        );

        try {
            // Step 4: Stream request cleanly via webClient
            String response = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path(geminiApiUrl.replace("https://generativelanguage.googleapis.com", ""))
                            .queryParam("key", geminiApiKey)
                            .build())
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            return extractResponseContent(response);

        } catch (Exception e) {
            return "Error while calling Gemini API: " + e.getMessage();
        }
    }

    private String extractAttachmentText(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return "";
        }
        try {
            // Tika reads the input stream and automatically parses text from PDFs/Docs
            return tika.parseToString(file.getInputStream());
        } catch (Exception e) {
            return "[Error reading attachment text: " + e.getMessage() + "]";
        }
    }

    private String buildPrompt(EmailRequest emailRequest, String attachmentContext) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Generate a professional email reply for the following email content. Please don't generate a subject line. ");

        if (emailRequest.getTone() != null && !emailRequest.getTone().isEmpty()) {
            prompt.append("Use a ").append(emailRequest.getTone()).append(" tone. ");
        }

        if (!attachmentContext.isEmpty()) {
            prompt.append("\n\n[ATTACHED DOCUMENT BACKGROUND CONTEXT]:\n")
                    .append(attachmentContext)
                    .append("\n[END OF CONTEXT]\nUse the attached background document context to inform your reply if relevant.");
        }

        prompt.append("\n\nOriginal email: \n").append(emailRequest.getEmailContent());
        return prompt.toString();
    }

    private String extractResponseContent(String response) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(response);
            return rootNode.path("candidates")
                    .get(0)
                    .path("content")
                    .path("parts")
                    .get(0)
                    .path("text")
                    .asText();
        } catch (Exception e) {
            return "Error processing Gemini response: " + e.getMessage();
        }
    }
}