package com.email.writer.app;

import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/email")
@AllArgsConstructor
// Upgraded CrossOrigin: Explicitly allows preflight headers and methods required by Chrome extensions
@CrossOrigin(
        origins = "*",
        allowedHeaders = "*",
        methods = {RequestMethod.POST, RequestMethod.GET, RequestMethod.OPTIONS}
)
public class EmailGeneratorController {

    private final EmailGeneratorService emailGeneratorService;

    // Supports both raw text inputs and file uploads smoothly
    @PostMapping(value = "/generate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> generateEmail(
            @RequestParam("emailContent") String emailContent,
            @RequestParam("tone") String tone,
            @RequestParam(value = "attachment", required = false) MultipartFile attachment) {

        EmailRequest emailRequest = new EmailRequest();
        emailRequest.setEmailContent(emailContent);
        emailRequest.setTone(tone);
        emailRequest.setAttachment(attachment);

        String response = emailGeneratorService.generateEmailReply(emailRequest);
        return ResponseEntity.ok(response);
    }
}