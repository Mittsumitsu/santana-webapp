// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// AuthContext作成
const AuthContext = createContext();

// AuthContextを使用するためのカスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// GoogleAuthProvider インスタンス
const googleProvider = new GoogleAuthProvider();

// AuthProvider コンポーネント
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // エラーメッセージの日本語化
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

  // ユーザー情報をFirestoreに保存
  const createUserDocument = async (user, additionalData = {}) => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);
    
    if (!userSnapshot.exists()) {
      const { displayName, email } = user;
      const createdAt = new Date();
      
      try {
        await setDoc(userRef, {
          id: user.uid,
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
          ...additionalData
        });
      } catch (error) {
        console.error('ユーザードキュメントの作成エラー:', error);
      }
    } else {
      // 既存ユーザーの最終ログイン時間を更新
      try {
        await setDoc(userRef, {
          lastLogin: new Date()
        }, { merge: true });
      } catch (error) {
        console.error('ユーザー情報の更新エラー:', error);
      }
    }
  };

  // メール・パスワードで新規登録
  const signup = async (email, password, displayName = '') => {
    try {
      setError(null);
      console.log('新規登録開始:', { email, displayName }); // デバッグログ
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Firebase登録成功:', result.user.uid); // デバッグログ
      
      // プロフィール更新
      if (displayName) {
        await updateProfile(result.user, { displayName });
        console.log('プロフィール更新完了:', displayName); // デバッグログ
      }
      
      // Firestoreにユーザー情報を保存
      await createUserDocument(result.user, { displayName });
      console.log('Firestore保存完了'); // デバッグログ
      
      return result;
    } catch (error) {
      console.error('新規登録詳細エラー:', error); // 詳細ログ
      console.error('エラーコード:', error.code); // エラーコード
      console.error('エラーメッセージ:', error.message); // エラーメッセージ
      
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // メール・パスワードでログイン
  const login = async (email, password) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      await createUserDocument(result.user);
      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Googleでログイン
  const loginWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      await createUserDocument(result.user);
      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (error) {
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

  // エラークリア
  const clearError = () => {
    setError(null);
  };

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await createUserDocument(user);
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Context Value
  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    loading,
    error,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;