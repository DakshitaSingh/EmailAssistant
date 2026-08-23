package com.email.writer.app;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class EmailRequest {
    private String emailContent;
    private String tone;
    private MultipartFile attachment; // Handles optional PDF attachments
}