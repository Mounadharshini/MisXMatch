package com.misxmatch.auth.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Default, zero-cost provider for local development: instead of calling a
 * real SMS gateway, it just prints the OTP to the backend console in the
 * exact format the frontend developer can read off while testing:
 *
 *   DEV OTP for +91XXXXXXXXXX: 123456
 *
 * Active whenever otp.mode=development (the default — see application.yml).
 * Never used automatically in production because {@code matchIfMissing}
 * only applies to the "development" value; setting OTP_MODE=production and
 * providing a real {@link SmsProvider} bean (e.g. a future
 * TwilioSmsProvider / Msg91SmsProvider / Fast2SmsProvider) replaces this
 * one with no other code changes required.
 */
@Service
@ConditionalOnProperty(name = "otp.mode", havingValue = "development", matchIfMissing = true)
public class DevConsoleSmsProvider implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(DevConsoleSmsProvider.class);

    @Value("${otp.mode:development}")
    private String otpMode;

    @Override
    public void sendOtp(String mobile, String otp) {
        // Deliberately printed with System.out (in addition to the logger)
        // so it's impossible to miss in a console during a live demo, and
        // clearly labeled DEV so nobody mistakes this for a real SMS send.
        String line = "DEV OTP for " + mobile + ": " + otp;
        System.out.println("==================================================");
        System.out.println(line);
        System.out.println("==================================================");
        log.info("[otp.mode={}] {}", otpMode, line);
    }
}
