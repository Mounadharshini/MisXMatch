package com.misxmatch.auth.email;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.Year;

/**
 * Real email delivery via the {@link JavaMailSender} bean auto-configured from application.yml.
 * Sends premium SaaS-styled HTML emails using the exact MisXMatch website color palette and branding.
 */
@Service
@ConditionalOnProperty(name = "otp.mode", havingValue = "production")
public class SmtpEmailProvider implements EmailProvider {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailProvider.class);

    private final JavaMailSender mailSender;

    @Value("${otp.mail-from:dhachumaa182@gmail.com}")
    private String fromAddress;

    @Value("${otp.expiry-minutes:5}")
    private long expiryMinutes;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendBaseUrl;

    public SmtpEmailProvider(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendOtp(String email, String otp) {
        sendPasswordResetOtp(email, "User", otp, (int) expiryMinutes);
    }

    @Override
    public void sendPasswordResetEmail(String email, String userName, String otp, String resetToken) {
        sendPasswordResetOtp(email, userName, otp, (int) expiryMinutes);
    }

    @Override
    public void sendPasswordResetOtp(String email, String userName, String otp, int expiryMins) {
        System.out.println("==================================================");
        System.out.println("MISXMATCH HTML RESET OTP for " + email + ": " + otp);
        System.out.println("==================================================");

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");
            
            helper.setFrom(new InternetAddress(fromAddress, "MISXMATCH"));
            helper.setTo(email);
            helper.setSubject("MISXMATCH — Password Reset Verification Code");

            String htmlContent = buildHtmlContent(userName, otp, expiryMins);
            helper.setText(htmlContent, true);

            mailSender.send(mimeMessage);
            log.info("Successfully dispatched MISXMATCH verification code email to {}", email);
        } catch (Exception e) {
            log.error("Failed to send HTML email via SMTP relay (falling back to plain text): {}", e.getMessage(), e);
            sendPlainTextFallback(email, otp);
        }
    }

    @Override
    public void sendPasswordResetSuccessEmail(String email, String userName) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");
            helper.setFrom(new InternetAddress(fromAddress, "MISXMATCH"));
            helper.setTo(email);
            helper.setSubject("MISXMATCH — Password Successfully Reset");
            String htmlContent = buildSuccessHtmlContent(userName);
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            log.info("Successfully dispatched password reset confirmation email to {}", email);
        } catch (Exception e) {
            log.warn("Could not send password reset confirmation email to {}: {}", email, e.getMessage());
        }
    }

    private String buildHtmlContent(String userName, String otp, int expiryMins) {
        String name = (userName != null && !userName.isBlank()) ? userName : "User";
        String formattedOtp = String.join(" ", otp.split(""));

        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>MISXMATCH — Password Reset Verification Code</title>
            </head>
            <body style="margin:0; padding:0; background-color:#f5f6fb; font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#0f172a; -webkit-font-smoothing:antialiased;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f5f6fb; padding: 45px 15px;">
                <tr>
                  <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:18px; overflow:hidden; box-shadow: 0 20px 50px -22px rgba(16,24,43,0.18); border: 1px solid rgba(24, 27, 74, 0.09); max-width: 100%;">
                      
                      <!-- Header Banner -->
                      <tr>
                        <td style="background: linear-gradient(150deg, #131530 0%, #202451 45%, #2c3270 75%, #3a4396 100%); padding: 40px 30px; text-align: center;">
                          <div style="display:inline-block; padding: 8px 20px; background-color: rgba(255,255,255,0.12); border-radius: 999px; border: 1px solid rgba(255,255,255,0.22); margin-bottom: 10px;">
                            <span style="color:#ffffff; font-size:22px; font-weight:800; letter-spacing:1.5px; font-family:'Outfit', sans-serif;">🔍 MISXMATCH</span>
                          </div>
                          <p style="color:#34d399; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2.2px; font-weight: 700;">National Missing Person Search & Reunification Portal</p>
                        </td>
                      </tr>

                      <!-- Security Lock Badge -->
                      <tr>
                        <td style="padding: 38px 35px 0 35px; text-align: center;">
                          <div style="width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: #f3f4fc; border: 1px solid #c1c6ef; display: inline-block; text-align: center;">
                            <span style="font-size: 26px; vertical-align: middle;">🔐</span>
                          </div>
                          <h2 style="font-size: 26px; font-weight: 800; color:#131530; margin-top: 18px; margin-bottom: 6px; letter-spacing: -0.02em; font-family:'Outfit', sans-serif;">Password Reset Verification Code</h2>
                        </td>
                      </tr>

                      <!-- Body Content -->
                      <tr>
                        <td style="padding: 15px 40px 38px 40px; color:#475569;">
                          <p style="font-size: 15px; line-height: 1.65; color:#475569; margin-bottom: 28px; text-align: center;">
                            Hi <strong style="color:#131530;">{{userName}}</strong>,<br>
                            We received a request to reset your MISXMATCH account password. Use the verification code below to proceed.
                          </p>

                          <!-- Hero OTP Container -->
                          <div style="background-color:#f9fafc; border: 2px dashed #9aa2e2; border-radius: 16px; padding: 24px 20px; text-align: center; margin-bottom: 30px;">
                            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color:#3a4396; font-weight: 700; margin: 0 0 14px 0;">YOUR 6-DIGIT VERIFICATION CODE</p>
                            <div style="font-size: 32px; font-weight: 800; color:#1e1b4b; letter-spacing: 8px; font-family: 'JetBrains Mono', 'Courier New', Courier, monospace; padding: 14px 28px; border-radius: 12px; background: linear-gradient(135deg, #ffffff 0%, #f3f4fc 100%); border: 1px solid #c1c6ef; display: inline-block; white-space: nowrap; max-width: 100%; box-shadow: inset 0 2px 4px rgba(0,0,0,0.03);">
                              {{otp}}
                            </div>
                            <div style="margin-top: 14px;">
                              <span style="display:inline-flex; align-items:center; gap:6px; padding: 5px 14px; border-radius: 999px; background-color: rgba(225,29,72,0.08); border: 1px solid rgba(225,29,72,0.22); color:#e11d48; font-size:12px; font-weight:700;">
                                ⏱ Expires in {{expiryMinutes}} minutes
                              </span>
                            </div>
                          </div>

                          <!-- Warning Box -->
                          <div style="background-color:#fff1f2; border: 1px solid rgba(244, 63, 94, 0.25); border-left: 4px solid #f43f5e; border-radius: 10px; padding: 16px 20px; font-size: 13px; line-height: 1.65; color:#9f1239; margin-bottom: 20px;">
                            <div style="font-weight: 700; margin-bottom: 4px; font-size: 13px;">⚠️ Important Security Notice</div>
                            Do not share this code with anyone. MISXMATCH staff will never ask for it.
                          </div>

                          <!-- Ignore notice -->
                          <p style="font-size: 13px; color:#64748b; text-align: center; margin: 0;">
                            If you did not request this, you can ignore this email. Your password will remain unchanged.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color:#f3f4fc; padding: 24px 35px; text-align: center; border-top: 1px solid #e2e4f8; font-size: 12px; color:#475569; line-height: 1.6;">
                          <p style="margin: 0 0 6px 0; font-weight: 700; color: #131530;">MISXMATCH — AI-Powered Missing Person Search & Reunification Platform</p>
                          <p style="margin: 0; color: #94a3b8;">&copy; {{year}} MISXMATCH. All rights reserved.</p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        return template
                .replace("{{userName}}", name)
                .replace("{{otp}}", formattedOtp)
                .replace("{{expiryMinutes}}", String.valueOf(expiryMins))
                .replace("{{year}}", String.valueOf(Year.now().getValue()));
    }

    private String buildSuccessHtmlContent(String userName) {
        String name = (userName != null && !userName.isBlank()) ? userName : "User";
        String loginUrl = frontendBaseUrl + "/login";

        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>MisXMatch — Password Successfully Reset</title>
            </head>
            <body style="margin:0; padding:0; background-color:#f5f6fb; font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f5f6fb; padding: 45px 15px;">
                <tr>
                  <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:18px; overflow:hidden; box-shadow: 0 20px 50px -22px rgba(16,24,43,0.18); border: 1px solid rgba(24, 27, 74, 0.09); max-width: 100%;">
                      
                      <tr style="background: linear-gradient(135deg, #131530 0%, #10b981 100%); padding: 36px 30px; text-align: center;">
                        <td style="padding: 32px; text-align: center;">
                          <span style="color:#ffffff; font-size:22px; font-weight:800; letter-spacing:1.5px; font-family:'Outfit', sans-serif;">🔍 MisXMatch</span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 38px; text-align: center;">
                          <div style="width: 60px; height: 60px; border-radius: 50%; background-color: #e6f4ea; border: 1px solid #34d399; display: inline-block; line-height: 60px; text-align: center;">
                            <span style="font-size: 28px; color:#059669;">✓</span>
                          </div>
                          <h2 style="font-size: 25px; font-weight: 800; color:#131530; margin-top: 18px; margin-bottom: 10px; font-family:'Outfit', sans-serif;">Password Successfully Reset</h2>
                          <p style="font-size: 15px; color:#475569; line-height: 1.65; max-width: 440px; margin: 0 auto 28px auto;">
                            Hi <strong style="color:#131530;">{{userName}}</strong>,<br>
                            Your MisXMatch account password was successfully updated. If you did not make this change, please contact support immediately.
                          </p>
                          <a href="{{loginUrl}}" target="_blank" style="background: linear-gradient(135deg, #3a4396 0%, #10b981 100%); color:#ffffff; padding: 15px 36px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 8px 24px -8px rgba(58,67,150,0.55);">
                            Go to MisXMatch Login
                          </a>
                        </td>
                      </tr>

                      <tr>
                        <td style="background-color:#f3f4fc; padding: 22px; text-align: center; border-top: 1px solid #e2e4f8; font-size: 12px; color:#94a3b8;">
                          &copy; {{year}} MisXMatch. All rights reserved.
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        return template
                .replace("{{userName}}", name)
                .replace("{{loginUrl}}", loginUrl)
                .replace("{{year}}", String.valueOf(Year.now().getValue()));
    }

    private void sendPlainTextFallback(String email, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        try {
            message.setFrom(new InternetAddress(fromAddress, "MisXMatch").toString());
        } catch (Exception e) {
            message.setFrom(fromAddress);
        }
        message.setTo(email);
        message.setSubject("MISXMATCH — Password Reset Verification Code");
        message.setText(
                "Your MISXMATCH password reset verification code is: " + otp + "\n\n" +
                "Expires in " + expiryMinutes + " minute(s).\n\n" +
                "Do not share this code with anyone. MISXMATCH staff will never ask for it.\n\n" +
                "If you did not request this, you can ignore this email. Your password will remain unchanged."
        );
        try {
            mailSender.send(message);
        } catch (MailException ex) {
            log.error("Plain text email fallback also failed: {}", ex.getMessage());
        }
    }
}
