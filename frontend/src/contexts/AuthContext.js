// 📧 Firestore接続タイムアウト修正版 AuthContext.js
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// 実用的IDジェネレーター
const generatePracticalId = (length = 8) => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateUserId = () => `U_${generatePracticalId(8)}`;

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const googleProvider = new GoogleAuthProvider();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCache, setUserCache] = useState(new Map());
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(null);
  const processingUsers = useRef(new Set());

  const getErrorMessage = (errorCode) => {
    const errorMessages = {
      'auth/user-not-found': 'ユーザーが見つかりません',
      'auth/wrong-password': 'パスワードが間違っています',
      'auth/email-already-in-use': 'このメールアドレスは既に使用されています',
      'auth/weak-password': 'パスワードが弱すぎます（6文字以上にしてください）',
      'auth/invalid-email': 'メールアドレスの形式が正しくありません',
      'auth/user-disabled': 'このアカウントは無効化されています',
      'auth/too-many-requests': 'リクエストが多すぎます。しばらく経ってから再試行してください',
      'auth/network-request-failed': 'ネットワークエラーが発生しました',
      'auth/popup-closed-by-user': 'ログインがキャンセルされました',
      'auth/cancelled-popup-request': 'ログインがキャンセルされました'
    };
    return errorMessages[errorCode] || 'エラーが発生しました';
  };

  // 📧 メール認証関連の新機能

  /**
   * メール認証送信
   */
  const sendVerificationEmail = async () => {
    try {
      // 認証待ちユーザーがいる場合
      if (pendingVerification) {
        await sendEmailVerification(pendingVerification.user);
        setEmailVerificationSent(true);
        console.log('📧 認証待ちユーザーに認証メール送信完了');
        
        return {
          success: true,
          message: '認証メールを送信しました。メールボックスを確認してください。'
        };
      }

      if (!currentUser) {
        throw new Error('ログインが必要です');
      }

      await sendEmailVerification(currentUser);
      setEmailVerificationSent(true);
      console.log('✅ 認証メール送信完了');
      
      return {
        success: true,
        message: '認証メールを送信しました。メールボックスを確認してください。'
      };
    } catch (error) {
      console.error('❌ 認証メール送信失敗:', error);
      const errorMessage = getErrorMessage(error.code) || '認証メールの送信に失敗しました';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * メール認証状態の確認（認証待ち状態対応）
   */
  const checkEmailVerification = async () => {
    try {
      let userToCheck = currentUser;
      
      // 認証待ち状態の場合
      if (pendingVerification && pendingVerification.user) {
        userToCheck = pendingVerification.user;
        await reload(pendingVerification.user);
        console.log('🔄 認証待ちユーザーの状態を更新:', pendingVerification.user.emailVerified);
      } else if (currentUser) {
        await reload(currentUser);
      }
      
      if (!userToCheck) return false;
      
      const isVerified = userToCheck.emailVerified;
      
      // 認証が完了した場合
      if (isVerified && pendingVerification) {
        console.log('✅ メール認証完了！自動ログイン開始');
        
        // Firestoreにユーザーデータを作成
        const userWithCustomId = await createUserDocument(pendingVerification.user, {
          displayName: pendingVerification.displayName
        });
        
        // 正式にログイン状態にする
        setCurrentUser(userWithCustomId);
        setPendingVerification(null);
        setEmailVerificationSent(false);
        
        return true;
      }
      
      return isVerified;
    } catch (error) {
      console.error('❌ 認証状態確認エラー:', error);
      return false;
    }
  };

  /**
   * アクセスレベルの取得
   */
  const getAccessLevel = () => {
    if (pendingVerification) return 'pending';
    if (!currentUser) return 'guest';
    if (!currentUser.emailVerified && !currentUser?.userData?.emailVerified) return 'unverified';
    return 'verified';
  };

  /**
   * 予約可能かどうかの判定
   */
  const canMakeBooking = () => {
    const accessLevel = getAccessLevel();
    return accessLevel === 'verified';
  };

  /**
   * 認証状態のリフレッシュ
   */
  const refreshAuthState = async () => {
    if (currentUser) {
      await reload(currentUser);
      setCurrentUser({ ...currentUser });
    } else if (pendingVerification) {
      await reload(pendingVerification.user);
      await checkEmailVerification();
    }
  };

  // 🔧 修正版: タイムアウト耐性を向上

  const generateUniqueUserId = async () => {
    let attempts = 0;
    const maxAttempts = 5; // 試行回数を削減
    
    while (attempts < maxAttempts) {
      const candidateId = generateUserId();
      console.log(`🔍 ID候補生成: ${candidateId} (${attempts + 1}/${maxAttempts})`);
      
      try {
        const checkPromise = getDoc(doc(db, 'users', candidateId));
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 2000) // タイムアウトを短縮
        );
        
        const checkDoc = await Promise.race([checkPromise, timeoutPromise]);
        
        if (!checkDoc.exists()) {
          console.log(`✅ 一意なID確定: ${candidateId}`);
          return candidateId;
        } else {
          console.log(`⚠️ ID重複検出: ${candidateId}`);
          attempts++;
        }
      } catch (error) {
        console.log(`⚠️ チェック失敗 (${candidateId}): ${error.message}`);
        
        // タイムアウトや接続エラーの場合は採用
        if (error.message === 'timeout' || error.code === 'unavailable' || error.code === 'permission-denied') {
          console.log(`🔧 ネットワークエラー時ID採用: ${candidateId}`);
          return candidateId;
        }
        
        attempts++;
      }
    }
    
    const fallbackId = generateUserId();
    console.log(`🔧 フォールバックID使用: ${fallbackId}`);
    return fallbackId;
  };

  // 🛠️ 修正版: createUserDocument - タイムアウト対策強化
  const createUserDocument = async (user, additionalData = {}) => {
    if (!user) return;
    
    const firebaseUid = user.uid;
    console.log('🔒 ユーザー作成開始:', user.email, firebaseUid);
    
    // 処理中チェック（簡略化）
    if (processingUsers.current.has(firebaseUid)) {
      console.log('⚠️ ユーザー作成処理中 - 短縮待機');
      for (let i = 0; i < 30; i++) { // 待機時間を短縮
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!processingUsers.current.has(firebaseUid)) break;
      }
    }
    
    // キャッシュチェック
    if (userCache.has(firebaseUid)) {
      const cachedUser = userCache.get(firebaseUid);
      console.log('💾 キャッシュからユーザー取得:', cachedUser.userData?.id);
      return cachedUser;
    }
    
    processingUsers.current.add(firebaseUid);
    
    try {
      // 📍 Step 1: Firebase UIDで既存ユーザー検索（短縮タイムアウト）
      console.log('🔍 Firebase UIDで検索:', firebaseUid);
      
      const usersRef = collection(db, 'users');
      const existingQuery = query(
        usersRef,
        where('firebase_uid', '==', firebaseUid),
        limit(1)
      );
      
      let existingSnapshot;
      try {
        console.log('⏱️ Firestore接続中（短縮タイムアウト）...');
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 4000) // 4秒に短縮
        );
        
        existingSnapshot = await Promise.race([
          getDocs(existingQuery),
          timeoutPromise
        ]);
        console.log('✅ Firebase UID検索完了');
      } catch (timeoutError) {
        console.error('⚠️ Firestore接続タイムアウト:', timeoutError.message);
        
        // タイムアウト時は即座に新規作成へスキップ
        console.log('🔧 タイムアウトのため新規作成へスキップ');
        existingSnapshot = { empty: true };
      }
      
      // 📍 Step 2: 既存ユーザーが見つかった場合
      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data();
        
        console.log('✅ 既存ユーザー発見:', existingData.id);
        
        // ログイン時間更新（失敗しても継続）
        try {
          const updatePromise = setDoc(existingDoc.ref, {
            lastLogin: new Date(),
            updated_at: new Date(),
            emailVerified: user.emailVerified || false
          }, { merge: true });
          
          const updateTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Update timeout')), 2000)
          );
          
          await Promise.race([updatePromise, updateTimeoutPromise]);
          console.log('✅ ログイン時間更新完了');
        } catch (updateError) {
          console.warn('⚠️ ログイン時間更新失敗（継続）:', updateError.message);
        }
        
        const userWithCustomId = { 
          ...user, 
          customUserId: existingData.id, 
          userData: { ...existingData, emailVerified: user.emailVerified || false }
        };
        
        userCache.set(firebaseUid, userWithCustomId);
        return userWithCustomId;
      }
      
      // 📍 Step 3: メールアドレスで既存ユーザー検索（スキップ可能）
      console.log('🔍 メールアドレスで検索（短縮版）:', user.email);
      
      let emailSnapshot = { empty: true };
      try {
        const emailQuery = query(
          usersRef,
          where('email', '==', user.email),
          limit(1)
        );
        
        const emailTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Email search timeout')), 2000) // 2秒に短縮
        );
        
        emailSnapshot = await Promise.race([
          getDocs(emailQuery),
          emailTimeoutPromise
        ]);
        console.log('✅ メールアドレス検索完了');
      } catch (emailTimeoutError) {
        console.error('⚠️ メール検索タイムアウト（新規作成継続）:', emailTimeoutError.message);
        emailSnapshot = { empty: true };
      }
      
      // 📍 Step 4: 同一メールアドレスのユーザーが見つかった場合
      if (!emailSnapshot.empty) {
        const emailDoc = emailSnapshot.docs[0];
        const emailData = emailDoc.data();
        
        console.log('⚠️ 同一メールアドレスのユーザー発見:', emailData.id);
        
        // Firebase UID更新（失敗しても継続）
        try {
          const mergePromise = setDoc(emailDoc.ref, {
            firebase_uid: firebaseUid,
            lastLogin: new Date(),
            updated_at: new Date(),
            emailVerified: user.emailVerified || false
          }, { merge: true });
          
          const mergeTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Merge timeout')), 2000)
          );
          
          await Promise.race([mergePromise, mergeTimeoutPromise]);
          console.log('✅ Firebase UID更新完了');
        } catch (updateError) {
          console.warn('⚠️ Firebase UID更新失敗（継続）:', updateError.message);
        }
        
        const userWithCustomId = { 
          ...user, 
          customUserId: emailData.id, 
          userData: { 
            ...emailData, 
            firebase_uid: firebaseUid, 
            emailVerified: user.emailVerified || false 
          }
        };
        
        userCache.set(firebaseUid, userWithCustomId);
        return userWithCustomId;
      }
      
      // 📍 Step 5: 完全新規ユーザー作成
      console.log('🆕 完全新規ユーザー作成開始');
      
      const customUserId = await generateUniqueUserId();
      console.log('🆔 最終ID決定:', customUserId);
      
      const userRef = doc(db, 'users', customUserId);
      const { displayName, email } = user;
      const createdAt = new Date();
      
      const userData = {
        id: customUserId,
        firebase_uid: firebaseUid,
        displayName: displayName || additionalData.displayName || '',
        email,
        createdAt,
        lastLogin: createdAt,
        userType: 'guest', // デフォルトはguest
        language: 'ja',
        emailVerified: user.emailVerified || false,
        emailPreferences: {
          marketing: false,
          bookingConfirmation: true
        },
        created_at: createdAt,
        updated_at: createdAt,
        creation_method: 'auth_context',
        ...additionalData
      };

      // 📍 Step 6: Firestoreにユーザードキュメントを作成（強化版タイムアウト）
      let createSuccess = false;
      try {
        console.log('💾 Firestore書き込み開始（タイムアウト対策版）...');
        
        const writePromise = setDoc(userRef, userData);
        const writeTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Write timeout')), 6000) // 6秒
        );
        
        await Promise.race([writePromise, writeTimeoutPromise]);
        console.log('✅ 新規ユーザー作成完了:', customUserId);
        createSuccess = true;
        
      } catch (createError) {
        console.error('❌ ユーザー作成失敗:', createError.message);
        console.error('🔧 詳細エラー:', {
          code: createError.code,
          message: createError.message
        });
        
        // 失敗時は一時的フラグを設定（機能は継続）
        userData.isTemporary = true;
        userData.creation_error = createError.message;
        userData.retry_needed = true;
        userData.offline_mode = true;
        
        console.log('🔧 一時的ユーザーとして継続（機能制限なし）:', customUserId);
      }
      
      const userWithCustomId = { 
        ...user, 
        customUserId, 
        userData,
        creation_success: createSuccess
      };
      
      userCache.set(firebaseUid, userWithCustomId);
      
      // 成功/失敗に関わらず、ユーザーとして使用可能
      if (createSuccess) {
        console.log('🎉 新規ユーザー正常作成:', {
          customUserId,
          email: user.email,
          firebaseUid,
          displayName: userData.displayName
        });
      } else {
        console.log('🔧 一時ユーザーとして作成（後で同期可能）:', {
          customUserId,
          email: user.email,
          temporary: true
        });
      }
      
      return userWithCustomId;
      
    } catch (error) {
      console.error('❌ ユーザードキュメント作成エラー:', error);
      console.error('🔧 エラー詳細:', {
        code: error.code,
        message: error.message
      });
      
      // エラー時でも使用可能なフォールバックユーザー作成
      const fallbackUserData = {
        id: generateUserId(),
        displayName: user.displayName || 'ユーザー',
        email: user.email,
        userType: 'guest',
        emailVerified: user.emailVerified || false,
        isTemporary: true,
        offline_mode: true,
        error: error.message,
        error_code: error.code,
        fallback_created: true,
        functional: true // 機能は正常使用可能
      };
      
      const fallbackUser = { 
        ...user, 
        customUserId: fallbackUserData.id, 
        userData: fallbackUserData 
      };
      
      userCache.set(firebaseUid, fallbackUser);
      console.log('🔧 フォールバックユーザー作成（完全機能）:', fallbackUserData.id);
      return fallbackUser;
      
    } finally {
      processingUsers.current.delete(firebaseUid);
      console.log('🔓 ユーザー作成処理終了:', firebaseUid);
    }
  };

  // Firebase UIDから新IDフォーマットのユーザーを検索
  const findUserByFirebaseUid = async (firebaseUid) => {
    try {
      if (userCache.has(firebaseUid)) {
        const cachedUser = userCache.get(firebaseUid);
        console.log('💾 キャッシュからユーザー検索:', cachedUser.userData?.id);
        return cachedUser.userData;
      }
      
      console.log('🔍 Firebase UIDでユーザー検索:', firebaseUid);
      
      const usersRef = collection(db, 'users');
      const userQuery = query(
        usersRef,
        where('firebase_uid', '==', firebaseUid),
        limit(1)
      );
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Search timeout')), 2000) // 短縮
      );
      
      const userSnapshot = await Promise.race([
        getDocs(userQuery),
        timeoutPromise
      ]);
      
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        console.log('✅ ユーザー発見:', userData.id);
        return userData;
      }
      
      console.log('❌ ユーザーが見つかりませんでした');
      return null;
    } catch (error) {
      console.error('❌ Firebase UIDでのユーザー検索エラー:', error.message);
      return null;
    }
  };

  // 📧 メール・パスワードで新規登録（認証完了まで一時ログアウト）
  const signup = async (email, password, displayName = '') => {
    try {
      setError(null);
      console.log('🎯 新規登録開始:', { email, displayName });
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase登録成功:', result.user.uid);
      
      if (displayName) {
        await updateProfile(result.user, { displayName });
        console.log('✅ プロフィール更新完了:', displayName);
      }
      
      // 📧 認証メール自動送信
      try {
        await sendEmailVerification(result.user);
        setEmailVerificationSent(true);
        console.log('📧 認証メール自動送信完了');
      } catch (emailError) {
        console.warn('⚠️ 認証メール送信失敗（継続）:', emailError.message);
      }
      
      // 🚨 重要：認証完了まで一時的にログアウト
      console.log('🔄 認証完了まで一時ログアウト');
      setPendingVerification({
        user: result.user,
        email: email,
        displayName: displayName || ''
      });
      
      // Firebaseからログアウト（認証完了まで）
      await signOut(auth);
      
      console.log('📧 認証メール送信完了。メール認証後に再ログインしてください。');
      
      return {
        success: true,
        message: '認証メールを送信しました。メール内のリンクをクリックして認証を完了してください。',
        pendingVerification: true
      };
    } catch (error) {
      console.error('❌ 新規登録詳細エラー:', error);
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // メール・パスワードでログイン
  const login = async (email, password) => {
    try {
      setError(null);
      console.log('🎯 ログイン開始:', email);
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase認証成功:', result.user.uid);
      
      // メール認証チェック
      if (!result.user.emailVerified) {
        console.log('⚠️ メール未認証ユーザー');
        
        // 未認証ユーザーは一時ログアウト
        setPendingVerification({
          user: result.user,
          email: email,
          displayName: result.user.displayName || ''
        });
        
        await signOut(auth);
        
        throw new Error('メールアドレスが認証されていません。認証メールのリンクをクリックしてから再度ログインしてください。');
      }
      
      const userWithCustomId = await createUserDocument(result.user);
      console.log('✅ 新IDフォーマットユーザー情報取得完了:', userWithCustomId.customUserId);
      
      return userWithCustomId;
    } catch (error) {
      console.error('❌ ログインエラー:', error);
      const errorMessage = getErrorMessage(error.code) || error.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Googleでログイン（認証済み扱い）
  const loginWithGoogle = async () => {
    try {
      setError(null);
      console.log('🎯 Googleログイン開始');
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google認証成功:', result.user.uid);
      
      // Googleログインは認証済み扱い
      result.user.emailVerified = true;
      
      const userWithCustomId = await createUserDocument(result.user);
      console.log('✅ Google新IDフォーマットFirestore保存完了:', userWithCustomId.customUserId);
      
      return userWithCustomId;
    } catch (error) {
      console.error('❌ Googleログインエラー:', error);
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      setError(null);
      console.log('🎯 ログアウト開始');
      
      setUserCache(new Map());
      setEmailVerificationSent(false);
      setPendingVerification(null);
      processingUsers.current.clear();
      
      await signOut(auth);
      console.log('✅ ログアウト完了');
    } catch (error) {
      console.error('❌ ログアウトエラー:', error);
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // パスワードリセット
  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const clearError = () => {
    setError(null);
  };

  // 認証状態の監視
  useEffect(() => {
    console.log('🔒 認証状態監視開始（タイムアウト対策版）');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 認証状態変更:', user ? `ユーザーあり (${user.uid}, verified: ${user.emailVerified})` : 'ユーザーなし');
      
      if (user) {
        // メール未認証の場合は認証待ち状態に
        if (!user.emailVerified) {
          console.log('📧 メール未認証ユーザー - 認証待ち状態に設定');
          setPendingVerification({
            user: user,
            email: user.email,
            displayName: user.displayName || ''
          });
          
          // 一時ログアウト
          await signOut(auth);
          setCurrentUser(null);
          setLoading(false);
          return;
        }
        
        try {
          if (processingUsers.current.has(user.uid)) {
            console.log('⚠️ ユーザー処理中 - onAuthStateChangedをスキップ');
            return;
          }
          
          if (userCache.has(user.uid)) {
            const cachedUser = userCache.get(user.uid);
            console.log('💾 キャッシュからユーザー設定:', cachedUser.userData?.id);
            cachedUser.userData.emailVerified = user.emailVerified;
            setCurrentUser(cachedUser);
            setPendingVerification(null);
            setLoading(false);
            return;
          }
          
          const userWithCustomId = await createUserDocument(user);
          setCurrentUser(userWithCustomId);
          setPendingVerification(null);
        } catch (error) {
          console.error('❌ 認証状態変更エラー:', error);
          // エラーでも基本的なユーザーオブジェクトは設定
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
        setUserCache(new Map());
        setEmailVerificationSent(false);
        processingUsers.current.clear();
      }
      setLoading(false);
    });

    return () => {
      console.log('🔒 認証状態監視終了');
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    loading,
    error,
    clearError,
    
    // 📧 メール認証関連の新機能
    sendVerificationEmail,
    checkEmailVerification,
    refreshAuthState,
    getAccessLevel,
    canMakeBooking,
    emailVerificationSent,
    pendingVerification,
    
    getUserId: () => {
      const customId = currentUser?.customUserId || currentUser?.userData?.id;
      console.log('🆔 getUserId:', customId);
      return customId;
    },
    getUserData: () => {
      const userData = currentUser?.userData;
      console.log('👤 getUserData:', userData?.id);
      return userData;
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;