// 🔧 修正版 AuthContext.js - ID生成ロジック改善
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// ==========================================
// 🎯 修正版 実用性重視IDジェネレーター
// ==========================================

const generatePracticalId = (length = 8) => {
  // 読み間違い防止文字セット（0,1,I,O除外）
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

const generateUserId = () => `U_${generatePracticalId(8)}`;

// AuthContext作成
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

  // 🔧 修正版: 効率的ID重複チェック
  const generateUniqueUserId = async () => {
    let attempts = 0;
    const maxAttempts = 10; // 試行回数増加
    
    while (attempts < maxAttempts) {
      const candidateId = generateUserId();
      console.log(`🔍 ID候補生成: ${candidateId} (${attempts + 1}/${maxAttempts})`);
      
      try {
        // 🔧 短いタイムアウト（1秒）で迅速チェック
        const checkPromise = getDoc(doc(db, 'users', candidateId));
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 1000)
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
        
        // 🔧 ネットワークエラーの場合、そのIDを使用
        if (error.message === 'timeout' || error.code === 'unavailable') {
          console.log(`🔧 ネットワークエラー時ID採用: ${candidateId}`);
          return candidateId;
        }
        
        attempts++;
      }
    }
    
    // 🔧 最終フォールバック: 正しいフォーマット維持
    const fallbackId = generateUserId();
    console.log(`🔧 フォールバックID使用: ${fallbackId}`);
    return fallbackId;
  };

  // 🔧 修正版 ユーザー情報をFirestoreに保存
  const createUserDocument = async (user, additionalData = {}) => {
    if (!user) return;
    
    const firebaseUid = user.uid;
    console.log('🔒 重複防止開始:', user.email, firebaseUid);
    
    // 🔒 処理中フラグチェック
    if (processingUsers.current.has(firebaseUid)) {
      console.log('⚠️ ユーザー作成処理中 - 待機');
      for (let i = 0; i < 100; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!processingUsers.current.has(firebaseUid)) break;
      }
    }
    
    // 🔒 キャッシュチェック
    if (userCache.has(firebaseUid)) {
      const cachedUser = userCache.get(firebaseUid);
      console.log('💾 キャッシュからユーザー取得:', cachedUser.userData?.id);
      return cachedUser;
    }
    
    processingUsers.current.add(firebaseUid);
    
    try {
      // 🔍 既存ユーザー検索（Firebase UID）
      console.log('🔍 Firebase UIDで検索:', firebaseUid);
      
      const usersRef = collection(db, 'users');
      const existingQuery = query(
        usersRef,
        where('firebase_uid', '==', firebaseUid),
        limit(1)
      );
      
      let existingSnapshot;
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 3000)
        );
        
        existingSnapshot = await Promise.race([
          getDocs(existingQuery),
          timeoutPromise
        ]);
      } catch (timeoutError) {
        console.error('⚠️ Firestore接続タイムアウト:', timeoutError.message);
        
        // オフライン時の一時ユーザー
        const tempUserData = {
          id: generateUserId(), // 🔧 正しいフォーマット使用
          displayName: user.displayName || 'オフラインユーザー',
          email: user.email,
          userType: 'guest',
          isTemporary: true
        };
        
        const tempUser = { 
          ...user, 
          customUserId: tempUserData.id, 
          userData: tempUserData 
        };
        
        userCache.set(firebaseUid, tempUser);
        return tempUser;
      }
      
      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data();
        
        console.log('✅ 既存ユーザー発見:', existingData.id);
        
        try {
          await setDoc(existingDoc.ref, {
            lastLogin: new Date(),
            updated_at: new Date()
          }, { merge: true });
        } catch (updateError) {
          console.warn('⚠️ ログイン時間更新失敗（継続）:', updateError.message);
        }
        
        const userWithCustomId = { 
          ...user, 
          customUserId: existingData.id, 
          userData: existingData 
        };
        
        userCache.set(firebaseUid, userWithCustomId);
        return userWithCustomId;
      }
      
      // 🔍 メールアドレスでも検索
      console.log('🔍 メールアドレスで検索:', user.email);
      const emailQuery = query(
        usersRef,
        where('email', '==', user.email),
        limit(1)
      );
      
      let emailSnapshot;
      try {
        const emailTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Email search timeout')), 3000)
        );
        
        emailSnapshot = await Promise.race([
          getDocs(emailQuery),
          emailTimeoutPromise
        ]);
      } catch (emailTimeoutError) {
        console.error('⚠️ メール検索タイムアウト:', emailTimeoutError.message);
        emailSnapshot = { empty: true };
      }
      
      if (!emailSnapshot.empty) {
        const emailDoc = emailSnapshot.docs[0];
        const emailData = emailDoc.data();
        
        console.log('⚠️ 同一メールアドレスのユーザー発見:', emailData.id);
        
        try {
          await setDoc(emailDoc.ref, {
            firebase_uid: firebaseUid,
            lastLogin: new Date(),
            updated_at: new Date()
          }, { merge: true });
        } catch (updateError) {
          console.warn('⚠️ Firebase UID更新失敗（継続）:', updateError.message);
        }
        
        const userWithCustomId = { 
          ...user, 
          customUserId: emailData.id, 
          userData: { ...emailData, firebase_uid: firebaseUid }
        };
        
        userCache.set(firebaseUid, userWithCustomId);
        return userWithCustomId;
      }
      
      // 🆕 完全新規ユーザー作成
      console.log('🆕 完全新規ユーザー作成開始');
      
      // 🔧 修正版: 効率的ID生成
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
        userType: 'guest',
        language: 'ja',
        emailPreferences: {
          marketing: false,
          bookingConfirmation: true
        },
        created_at: createdAt,
        updated_at: createdAt,
        ...additionalData
      };

      try {
        await setDoc(userRef, userData);
        console.log('✅ 新規ユーザー作成完了:', customUserId);
      } catch (createError) {
        console.error('❌ ユーザー作成失敗:', createError.message);
        userData.isTemporary = true;
      }
      
      const userWithCustomId = { 
        ...user, 
        customUserId, 
        userData 
      };
      
      userCache.set(firebaseUid, userWithCustomId);
      return userWithCustomId;
      
    } catch (error) {
      console.error('❌ ユーザードキュメント作成エラー:', error);
      
      // 🔧 フォールバック: 正しいフォーマット維持
      const fallbackUserData = {
        id: generateUserId(), // 🔧 正しいフォーマット
        displayName: user.displayName || 'エラーユーザー',
        email: user.email,
        userType: 'guest',
        isTemporary: true,
        error: error.message
      };
      
      const fallbackUser = { 
        ...user, 
        customUserId: fallbackUserData.id, 
        userData: fallbackUserData 
      };
      
      userCache.set(firebaseUid, fallbackUser);
      return fallbackUser;
    } finally {
      processingUsers.current.delete(firebaseUid);
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
        setTimeout(() => reject(new Error('Search timeout')), 3000)
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

  // メール・パスワードで新規登録
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
      
      const userWithCustomId = await createUserDocument(result.user, { displayName });
      console.log('✅ 新IDフォーマットFirestore保存完了:', userWithCustomId.customUserId);
      
      return userWithCustomId;
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
      
      const userWithCustomId = await createUserDocument(result.user);
      console.log('✅ 新IDフォーマットユーザー情報取得完了:', userWithCustomId.customUserId);
      
      return userWithCustomId;
    } catch (error) {
      console.error('❌ ログインエラー:', error);
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Googleでログイン
  const loginWithGoogle = async () => {
    try {
      setError(null);
      console.log('🎯 Googleログイン開始');
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google認証成功:', result.user.uid);
      
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
    console.log('🔒 認証状態監視開始（修正版）');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 認証状態変更:', user ? `ユーザーあり (${user.uid})` : 'ユーザーなし');
      
      if (user) {
        try {
          if (processingUsers.current.has(user.uid)) {
            console.log('⚠️ ユーザー処理中 - onAuthStateChangedをスキップ');
            return;
          }
          
          if (userCache.has(user.uid)) {
            const cachedUser = userCache.get(user.uid);
            console.log('💾 キャッシュからユーザー設定:', cachedUser.userData?.id);
            setCurrentUser(cachedUser);
            setLoading(false);
            return;
          }
          
          const customUserData = await findUserByFirebaseUid(user.uid);
          if (customUserData) {
            console.log('✅ 新IDフォーマットユーザー情報取得:', customUserData.id);
            const userWithCustomId = { 
              ...user, 
              customUserId: customUserData.id, 
              userData: customUserData 
            };
            
            userCache.set(user.uid, userWithCustomId);
            setCurrentUser(userWithCustomId);
          } else {
            console.log('🆕 新規ユーザー - ドキュメント作成');
            const userWithCustomId = await createUserDocument(user);
            setCurrentUser(userWithCustomId);
          }
        } catch (error) {
          console.error('❌ 認証状態変更エラー:', error);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
        setUserCache(new Map());
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