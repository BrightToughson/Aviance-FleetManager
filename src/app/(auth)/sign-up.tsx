import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, Animated, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSignUp, useClerk, useOAuth } from '@clerk/expo';
import * as Linking from 'expo-linking';

const { width } = Dimensions.get('window');

export default function SignUpScreen() {
  const router = useRouter();
  const signUpHook = useSignUp() as any;
  const signUp = signUpHook?.signUp !== undefined ? signUpHook.signUp : signUpHook;
  const { setActive } = (useClerk() as any) || {};
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(40))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true })
    ]).start();
  }, []);

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/(manager)/dashboard', { scheme: 'aviance' }),
      });

      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
      }
    } catch (err: any) {
      console.error('Google Sign Up error:', err);
      setErrorMsg(err.errors?.[0]?.message || err.message || 'Google Sign Up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter a password.');
      return;
    }
    if (!signUp || typeof signUp.create !== 'function') {
      console.warn('Clerk signUp not ready:', signUpHook);
      setErrorMsg('Sign up service is initializing, please try again in a moment.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const names = name.trim().split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';

      const signUpAttempt = await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName,
        lastName,
        unsafeMetadata: {
          role: 'manager'
        }
      });

      console.log('signUp.create result:', signUpAttempt?.status);

      // If sign-up is already complete and no verification code needed
      if (signUpAttempt?.status === 'complete' && signUpAttempt?.createdSessionId) {
        if (setActive) await setActive({ session: signUpAttempt.createdSessionId });
        return;
      }

      // Send verification code
      if (typeof signUpAttempt?.prepareEmailAddressVerification === 'function') {
        await signUpAttempt.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else if (typeof signUp?.prepareEmailAddressVerification === 'function') {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else if (typeof signUpAttempt?.prepareVerification === 'function') {
        await signUpAttempt.prepareVerification({ strategy: 'email_code' });
      } else if (typeof signUp?.prepareVerification === 'function') {
        await signUp.prepareVerification({ strategy: 'email_code' });
      }

      setPendingVerification(true);
    } catch (err: any) {
      console.error('Sign up error:', err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'An error occurred during sign up';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (typeof signUp?.prepareEmailAddressVerification === 'function') {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else if (typeof signUp?.prepareVerification === 'function') {
        await signUp.prepareVerification({ strategy: 'email_code' });
      }
      if (Platform.OS === 'web') window.alert('A new verification code was sent to ' + email);
      else Alert.alert('Sent', 'A new verification code was sent to ' + email);
    } catch (err: any) {
      console.error('Resend error:', err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Could not resend code';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) {
      setErrorMsg('Please enter the verification code.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      // Supply password if Clerk flagged it as missing
      if (password && (signUp?.missingFields || []).includes('password')) {
        try {
          await signUp.update({ password });
        } catch (e) {
          console.warn('Error updating password:', e);
        }
      }

      let verifyAttempt: any = null;
      if (typeof signUp?.attemptEmailAddressVerification === 'function') {
        verifyAttempt = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      } else if (typeof signUp?.attemptVerification === 'function') {
        verifyAttempt = await signUp.attemptVerification({ strategy: 'email_code', code: code.trim() });
      }

      // If password is still flagged as missing after email verification, update it now
      if (password && (verifyAttempt?.missingFields || []).includes('password')) {
        try {
          verifyAttempt = await signUp.update({ password });
        } catch (e) {
          console.warn('Error updating password post-verify:', e);
        }
      }

      const status = verifyAttempt?.status || signUp?.status;
      const sessionId = verifyAttempt?.createdSessionId || signUp?.createdSessionId;

      console.log('Verify attempt result:', { status, sessionId, missingFields: verifyAttempt?.missingFields || signUp?.missingFields, unverifiedFields: verifyAttempt?.unverifiedFields || signUp?.unverifiedFields });

      if (status === 'complete' && sessionId) {
        if (setActive) await setActive({ session: sessionId });
        return;
      } else {
        const missing = (verifyAttempt?.missingFields || signUp?.missingFields || []).join(', ');
        const unverified = (verifyAttempt?.unverifiedFields || signUp?.unverifiedFields || []).join(', ');
        let msg = 'Further verification is required.';
        if (missing) msg += ` Missing fields: ${missing}.`;
        if (unverified) msg += ` Unverified fields: ${unverified}.`;
        if (!missing && !unverified && status) msg += ` Current status: ${status}.`;
        setErrorMsg(msg);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Verification failed';
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%', alignItems: 'center' }}>
          
          <View style={styles.header}>
            <Image source={require('../../../assets/images/logo/logo.png')} style={styles.logo} resizeMode="contain" />
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>Manager Portal</Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            <TouchableOpacity style={styles.backBtn} onPress={() => {
              if (pendingVerification) setPendingVerification(false);
              else router.replace('/(auth)/sign-in');
            }}>
              <Ionicons name="arrow-back" size={24} color="#6B7280" />
            </TouchableOpacity>

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.description}>
              {pendingVerification 
                ? 'We sent a 6-digit code to your email. Enter it below.' 
                : 'Request a manager account to start managing your fleet.'}
            </Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {!pendingVerification ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input}
                      placeholder="e.g. Jane Doe"
                      placeholderTextColor="#9CA3AF"
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input}
                      placeholder="manager@aviance.com"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]} 
                  onPress={handleSignUp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryButtonText}>Creating Account...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={styles.primaryButtonText}>Sign Up</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.divider} />
                </View>

                <TouchableOpacity 
                  style={[styles.googleBtn, isLoading && styles.primaryButtonDisabled]}
                  onPress={handleGoogleSignUp}
                  disabled={isLoading}
                >
                  <Ionicons name="logo-google" size={20} color="#DB4437" style={{ marginRight: 10 }} />
                  <Text style={styles.googleBtnText}>Sign Up with Google</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification Code</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="keypad-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input}
                      placeholder="123456"
                      placeholderTextColor="#9CA3AF"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]} 
                  onPress={handleVerify}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryButtonText}>Verifying...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={styles.primaryButtonText}>Verify & Complete</Text>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <TouchableOpacity onPress={handleResendCode} disabled={isLoading}>
                    <Text style={{ color: '#1E40AF', fontWeight: '600', fontSize: 13 }}>
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setPendingVerification(false)} disabled={isLoading}>
                    <Text style={{ color: '#6B7280', fontSize: 13 }}>
                      Change Email
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')}>
              <Text style={styles.signInLinkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
          
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  bgCircle1: { position: 'absolute', width: width * 1.2, height: width * 1.2, borderRadius: width * 0.6, backgroundColor: '#DBEAFE', top: -width * 0.4, left: -width * 0.2, opacity: 0.6 },
  bgCircle2: { position: 'absolute', width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: '#E0E7FF', bottom: -width * 0.2, right: -width * 0.2, opacity: 0.6 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 10 },
  header: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 220, height: 70, marginBottom: 12 },
  badgeContainer: { backgroundColor: '#1E40AF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  formContainer: { 
    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
    borderRadius: 28, 
    padding: 32, 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 20 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 40, 
    elevation: 8,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  backBtn: { marginBottom: 16, width: 40, height: 40, justifyContent: 'center', borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 8, letterSpacing: -1 },
  description: { fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 24 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 14, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#FCA5A5' },
  errorText: { color: '#DC2626', fontSize: 14, fontWeight: '500', marginLeft: 8, flex: 1 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, height: 60 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#111827', height: '100%', outlineStyle: 'none' as any },
  eyeIcon: { padding: 4 },
  primaryButton: { flexDirection: 'row', backgroundColor: '#043094', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', shadowColor: '#043094', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8, marginTop: 12 },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  footerText: { color: '#6B7280', fontSize: 15 },
  signInLinkText: { color: '#2563EB', fontSize: 15, fontWeight: '700' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 16, color: '#9CA3AF', fontWeight: '600', fontSize: 13 },
  googleBtn: { flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center' },
  googleBtnText: { color: '#1F2937', fontSize: 16, fontWeight: '700' },
});
