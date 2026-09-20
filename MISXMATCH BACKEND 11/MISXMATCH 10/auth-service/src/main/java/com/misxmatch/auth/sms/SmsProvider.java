package com.misxmatch.auth.sms;

/**
 * Abstraction over "however we actually deliver an OTP to a phone".
 * {@link com.misxmatch.auth.service.OtpService} only ever depends on this
 * interface, never on a concrete provider — so switching from the free
 * dev-console implementation to Twilio/MSG91/Fast2SMS later is a matter of
 * adding one new {@code @Service} class and flipping the {@code otp.mode}
 * property; no OTP generation/hashing/expiry/attempt logic changes at all.
 */
public interface SmsProvider {

    /**
     * Deliver a one-time password to the given mobile number.
     *
     * @param mobile E.164-ish formatted number, e.g. "+919876543210"
     * @param otp    the plain 6-digit OTP (never logged/stored anywhere else)
     */
    void sendOtp(String mobile, String otp);
}
