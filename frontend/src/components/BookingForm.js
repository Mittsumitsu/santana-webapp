import React, { useState, useEffect } from 'react';
import '../styles/BookingForm.css';

const BookingForm = ({ bookingData, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    primaryContact: {
      lastName: '',
      firstName: '',
      lastNameRomaji: '',
      firstNameRomaji: '',
      email: '',
      gender: 'male'
    },
    roomGuests: [], // 各部屋のゲスト情報
    arrivalTime: '14:00',
    notes: '',
    agreeToTerms: false
  });

  const [formError, setFormError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // bookingDataが変更されたときに初期化
  useEffect(() => {
    if (bookingData?.combination?.guest_allocation) {
      // 前ページの情報を取得
      const searchParams = bookingData.searchParams;
      const maleCount = searchParams.maleGuests || 0;
      const femaleCount = searchParams.femaleGuests || 0;
      
      // 性別を自動判定（単一性別の場合）
      let autoGender = 'male';
      if (maleCount === 0 && femaleCount > 0) {
        autoGender = 'female';
      } else if (maleCount > 0 && femaleCount === 0) {
        autoGender = 'male';
      }

      // 到着時間を引き継ぎ
      const inheritedArrivalTime = searchParams.checkInTime || '14:00';

      const initialRoomGuests = bookingData.combination.guest_allocation.map((allocation, roomIndex) => {
        const room = bookingData.combination.rooms[roomIndex];
        const guests = [];
        
        // 男性ゲストを追加
        for (let i = 0; i < allocation.male_guests; i++) {
          guests.push({
            lastNameRomaji: '',
            firstNameRomaji: '',
            gender: 'male',
            isPrimary: false
          });
        }
        
        // 女性ゲストを追加
        for (let i = 0; i < allocation.female_guests; i++) {
          guests.push({
            lastNameRomaji: '',
            firstNameRomaji: '',
            gender: 'female',
            isPrimary: false
          });
        }

        return {
          roomId: allocation.room_id,
          roomName: room.name,
          guests: guests
        };
      });

      setFormData(prev => ({
        ...prev,
        primaryContact: {
          ...prev.primaryContact,
          gender: autoGender
        },
        roomGuests: initialRoomGuests,
        arrivalTime: inheritedArrivalTime
      }));
    }
  }, [bookingData]);

  // ローマ字バリデーション
  const validateRomaji = (value) => {
    const romajiPattern = /^[A-Za-z\s]*$/;
    return romajiPattern.test(value);
  };

  // メールアドレスバリデーション
  const validateEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  // リアルタイムバリデーション
  const handleInputValidation = (name, value) => {
    const newErrors = { ...validationErrors };

    if (name.includes('Romaji')) {
      if (value && !validateRomaji(value)) {
        newErrors[name] = 'ローマ字（アルファベット）のみ入力してください';
      } else {
        delete newErrors[name];
      }
    }

    if (name === 'primaryContact.email') {
      if (value && !validateEmail(value)) {
        newErrors[name] = '正しいメールアドレスを入力してください';
      } else {
        delete newErrors[name];
      }
    }

    setValidationErrors(newErrors);
  };

  // 入力フィールドの変更ハンドラ
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // リアルタイムバリデーション
    handleInputValidation(name, value);
    
    if (name.startsWith('primaryContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        primaryContact: {
          ...prev.primaryContact,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // 部屋ゲスト情報の変更ハンドラ
  const handleRoomGuestChange = (roomIndex, guestIndex, field, value) => {
    // ローマ字フィールドのバリデーション
    if (field.includes('Romaji')) {
      const fieldKey = `room_${roomIndex}_guest_${guestIndex}_${field}`;
      handleInputValidation(fieldKey, value);
    }

    setFormData(prev => {
      const newRoomGuests = [...prev.roomGuests];
      newRoomGuests[roomIndex] = {
        ...newRoomGuests[roomIndex],
        guests: newRoomGuests[roomIndex].guests.map((guest, index) => 
          index === guestIndex ? { ...guest, [field]: value } : guest
        )
      };
      return {
        ...prev,
        roomGuests: newRoomGuests
      };
    });
  };

  // 代表者をゲストリストの一人に設定
  const handleSetPrimaryGuest = (roomIndex, guestIndex) => {
    setFormData(prev => {
      const newRoomGuests = prev.roomGuests.map((room, rIndex) => ({
        ...room,
        guests: room.guests.map((guest, gIndex) => ({
          ...guest,
          isPrimary: rIndex === roomIndex && gIndex === guestIndex
        }))
      }));
      
      return {
        ...prev,
        roomGuests: newRoomGuests
      };
    });
  };

  // フォーム検証
  const validateForm = () => {
    // バリデーションエラーがある場合
    if (Object.keys(validationErrors).length > 0) {
      setFormError('入力内容に誤りがあります。赤色の警告を確認してください。');
      return false;
    }

    // 代表者情報の検証
    if (!formData.primaryContact.lastName.trim()) {
      setFormError('代表者の姓は必須です');
      return false;
    }
    
    if (!formData.primaryContact.firstName.trim()) {
      setFormError('代表者の名は必須です');
      return false;
    }

    if (!formData.primaryContact.lastNameRomaji.trim()) {
      setFormError('代表者の姓（ローマ字）は必須です');
      return false;
    }

    if (!formData.primaryContact.firstNameRomaji.trim()) {
      setFormError('代表者の名（ローマ字）は必須です');
      return false;
    }
    
    if (!formData.primaryContact.email.trim()) {
      setFormError('代表者のメールアドレスは必須です');
      return false;
    }

    if (!validateEmail(formData.primaryContact.email)) {
      setFormError('正しいメールアドレスを入力してください');
      return false;
    }

    // 各部屋のゲスト情報検証
    for (let roomIndex = 0; roomIndex < formData.roomGuests.length; roomIndex++) {
      const room = formData.roomGuests[roomIndex];
      for (let guestIndex = 0; guestIndex < room.guests.length; guestIndex++) {
        const guest = room.guests[guestIndex];
        if (!guest.lastNameRomaji.trim() || !guest.firstNameRomaji.trim()) {
          setFormError(`${room.roomName}のゲスト${guestIndex + 1}のローマ字氏名を入力してください`);
          return false;
        }
      }
    }

    // 利用規約同意の確認
    if (!formData.agreeToTerms) {
      setFormError('利用規約に同意してください');
      return false;
    }

    setFormError(null);
    return true;
  };

  // フォーム送信
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // APIに送信するデータ形式に変換
    const submitData = {
      user_id: 'temp_user_' + Date.now(),
      check_in_date: bookingData.searchParams.checkIn,
      check_out_date: bookingData.searchParams.checkOut,
      primary_contact: {
        name_kanji: `${formData.primaryContact.lastName} ${formData.primaryContact.firstName}`,
        name_romaji: `${formData.primaryContact.lastNameRomaji} ${formData.primaryContact.firstNameRomaji}`,
        email: formData.primaryContact.email,
        gender: formData.primaryContact.gender
      },
      rooms: formData.roomGuests.map((room, roomIndex) => {
        const allocation = bookingData.combination.guest_allocation[roomIndex];
        return {
          room_id: room.roomId,
          check_in_time: formData.arrivalTime,
          guests: room.guests.map(guest => ({
            name_romaji: `${guest.lastNameRomaji} ${guest.firstNameRomaji}`,
            gender: guest.gender
          })),
          price: allocation.room_price
        };
      }),
      notes: formData.notes
    };

    onSubmit(submitData);
  };

  if (!bookingData) {
    return <div className="loading">予約データを読み込み中...</div>;
  }

  const { combination, searchParams } = bookingData;

  return (
    <div className="booking-form-container">
      <h2>予約者情報の入力</h2>
      
      {formError && (
        <div className="form-error-message">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="booking-form">
        {/* 代表者情報 */}
        <div className="form-section">
          <h3>代表者情報</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="primaryLastName">姓 *</label>
              <input
                type="text"
                id="primaryLastName"
                name="primaryContact.lastName"
                value={formData.primaryContact.lastName}
                onChange={handleChange}
                className="form-control"
                placeholder="例：山田"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="primaryFirstName">名 *</label>
              <input
                type="text"
                id="primaryFirstName"
                name="primaryContact.firstName"
                value={formData.primaryContact.firstName}
                onChange={handleChange}
                className="form-control"
                placeholder="例：太郎"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="primaryLastNameRomaji">姓（ローマ字） *</label>
              <input
                type="text"
                id="primaryLastNameRomaji"
                name="primaryContact.lastNameRomaji"
                value={formData.primaryContact.lastNameRomaji}
                onChange={handleChange}
                className={`form-control ${validationErrors['primaryContact.lastNameRomaji'] ? 'error' : ''}`}
                placeholder="例：YAMADA"
                required
              />
              {validationErrors['primaryContact.lastNameRomaji'] && (
                <div className="field-error">{validationErrors['primaryContact.lastNameRomaji']}</div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="primaryFirstNameRomaji">名（ローマ字） *</label>
              <input
                type="text"
                id="primaryFirstNameRomaji"
                name="primaryContact.firstNameRomaji"
                value={formData.primaryContact.firstNameRomaji}
                onChange={handleChange}
                className={`form-control ${validationErrors['primaryContact.firstNameRomaji'] ? 'error' : ''}`}
                placeholder="例：TARO"
                required
              />
              {validationErrors['primaryContact.firstNameRomaji'] && (
                <div className="field-error">{validationErrors['primaryContact.firstNameRomaji']}</div>
              )}
            </div>
          </div>
          
          <div className="form-group full-width">
            <label htmlFor="primaryEmail">メールアドレス *</label>
            <input
              type="email"
              id="primaryEmail"
              name="primaryContact.email"
              value={formData.primaryContact.email}
              onChange={handleChange}
              className={`form-control ${validationErrors['primaryContact.email'] ? 'error' : ''}`}
              placeholder="例：example@example.com"
              required
            />
            {validationErrors['primaryContact.email'] && (
              <div className="field-error">{validationErrors['primaryContact.email']}</div>
            )}
          </div>
          
          <div className="form-group full-width">
            <label htmlFor="primaryGender">性別 *</label>
            <select
              id="primaryGender"
              name="primaryContact.gender"
              value={formData.primaryContact.gender}
              onChange={handleChange}
              className="form-control"
              required
            >
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
          </div>
        </div>

        {/* 各部屋のゲスト情報 */}
        {formData.roomGuests.map((room, roomIndex) => (
          <div key={room.roomId} className="form-section">
            <h3>{room.roomName} のゲスト情報</h3>
            <div className="guests-list">
              {room.guests.map((guest, guestIndex) => (
                <div key={guestIndex} className="guest-form">
                  <div className="guest-header">
                    <h4>ゲスト {guestIndex + 1} ({guest.gender === 'male' ? '男性' : '女性'})</h4>
                    <button
                      type="button"
                      className={`primary-btn ${guest.isPrimary ? 'active' : ''}`}
                      onClick={() => handleSetPrimaryGuest(roomIndex, guestIndex)}
                    >
                      {guest.isPrimary ? '代表者' : '代表者に設定'}
                    </button>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>姓（ローマ字） *</label>
                      <input
                        type="text"
                        value={guest.lastNameRomaji}
                        onChange={(e) => handleRoomGuestChange(roomIndex, guestIndex, 'lastNameRomaji', e.target.value)}
                        className={`form-control ${validationErrors[`room_${roomIndex}_guest_${guestIndex}_lastNameRomaji`] ? 'error' : ''}`}
                        placeholder="例：YAMADA"
                        required
                      />
                      {validationErrors[`room_${roomIndex}_guest_${guestIndex}_lastNameRomaji`] && (
                        <div className="field-error">{validationErrors[`room_${roomIndex}_guest_${guestIndex}_lastNameRomaji`]}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>名（ローマ字） *</label>
                      <input
                        type="text"
                        value={guest.firstNameRomaji}
                        onChange={(e) => handleRoomGuestChange(roomIndex, guestIndex, 'firstNameRomaji', e.target.value)}
                        className={`form-control ${validationErrors[`room_${roomIndex}_guest_${guestIndex}_firstNameRomaji`] ? 'error' : ''}`}
                        placeholder="例：TARO"
                        required
                      />
                      {validationErrors[`room_${roomIndex}_guest_${guestIndex}_firstNameRomaji`] && (
                        <div className="field-error">{validationErrors[`room_${roomIndex}_guest_${guestIndex}_firstNameRomaji`]}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 到着予定時間 */}
        <div className="form-section">
          <h3>到着情報</h3>
          <div className="form-group">
            <label htmlFor="arrivalTime">到着予定時間</label>
            <select
              id="arrivalTime"
              name="arrivalTime"
              value={formData.arrivalTime}
              onChange={handleChange}
              className="form-control"
            >
              <option value="10:00">午前10時</option>
              <option value="11:00">午前11時</option>
              <option value="12:00">正午</option>
              <option value="13:00">午後1時</option>
              <option value="14:00">午後2時</option>
              <option value="15:00">午後3時</option>
              <option value="16:00">午後4時</option>
              <option value="17:00">午後5時</option>
              <option value="18:00">午後6時</option>
              <option value="19:00">午後7時</option>
              <option value="20:00">午後8時</option>
              <option value="21:00">午後9時</option>
              <option value="22:00">午後10時</option>
              <option value="23:00">午後11時</option>
            </select>
          </div>
        </div>

        {/* 特記事項 */}
        <div className="form-section">
          <h3>特記事項・リクエスト</h3>
          <div className="form-group">
            <label htmlFor="notes">その他ご要望</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-control"
              rows="4"
              placeholder="特別なリクエストや注意事項があればご記入ください"
            />
          </div>
        </div>

        {/* 利用規約同意 */}
        <div className="form-section">
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                required
              />
              <span className="checkmark"></span>
              利用規約およびプライバシーポリシーに同意します *
            </label>
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="form-actions">
          <button
            type="submit"
            className="submit-btn"
            disabled={loading || Object.keys(validationErrors).length > 0}
          >
            {loading ? '予約送信中...' : '予約を確定する'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;