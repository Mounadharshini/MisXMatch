package com.misxmatch.auth.sms;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Placeholder for a real SMS gateway (Twilio / MSG91 / Fast2SMS / etc).
 *
 * To go live later:
 *   1. Add the provider's SDK (or a plain RestTemplate/WebClient HTTP call)
 *      to pom.xml and implement sendOtp() below using their send-SMS API.
 *   2. Add their API key/account SID as env vars in application.yml +
 *      docker-compose.yml (same pattern as JWT_SECRET / DB_PASSWORD).
 *   3. Set OTP_MODE=production. Spring then wires this bean in instead of
 *      DevConsoleSmsProvider — nothing in OtpServiceImpl changes.
 *
 * Intentionally left unimplemented (throws) until you wire a real
 * provider in, so a misconfigured OTP_MODE=production never silently
 * fails to deliver an OTP.
 */
@Service
@ConditionalOnProperty(name = "otp.mode", havingValue = "production")
public class ProductionSmsProvider implements SmsProvider {

    @Override
    public void sendOtp(String mobile, String otp) {
        throw new UnsupportedOperationException(
                "otp.mode=production but no real SMS provider has been implemented yet. " +
                "Implement ProductionSmsProvider.sendOtp() using Twilio/MSG91/Fast2SMS " +
                "before setting OTP_MODE=production.");
    }
}
