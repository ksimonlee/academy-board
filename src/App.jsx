import React, { useEffect, useMemo, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBFMVNEhppIhryGYnCMHvmkSCqdfXucolY",
  authDomain: "academy-board-37bb9.firebaseapp.com",
  projectId: "academy-board-37bb9",
  storageBucket: "academy-board-37bb9.firebasestorage.app",
  messagingSenderId: "425499433220",
  appId: "1:425499433220:web:82613d896ae8474af19851",
  measurementId: "G-F9V36V74SN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const STATUS = {
  STUDY: '수업중',
  RIDING: '차량탑승',
  COMPLETE: '귀가완료',
};

const calculateLeaveTime = (time, duration = 90) => {
  if (!time) return '';

  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();

  date.setHours(hour);
  date.setMinutes(minute + Number(duration));

  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export default function App() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState('');
  const [enterTime, setEnterTime] = useState('');
  const [classDuration, setClassDuration] = useState(90);
  const [leaveTime, setLeaveTime] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editTime, setEditTime] = useState('');
  const [studentClassDuration, setStudentClassDuration] = useState(90);
  const [studentCustomLeaveTime, setStudentCustomLeaveTime] = useState('');

  // 현재 시간
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // URL 파라미터
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get('id');
  const isParentMode = Boolean(studentId);

  // Firebase 실시간 동기화
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const items = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      items.sort((a, b) => {
        const aDone = a.status === STATUS.COMPLETE;
        const bDone = b.status === STATUS.COMPLETE;

        if (aDone && !bDone) return 1;
        if (!aDone && bDone) return -1;

        return b.createdAt - a.createdAt;
      });

      setStudents(items);
    });

    return () => unsubscribe();
  }, []);

  // 학부모 필터
  const filteredStudents = useMemo(() => {
    if (!studentId) return students;

    return students.filter(
      (student) => student.studentCode === studentId
    );
  }, [students, studentId]);

  // 등원시간 또는 수업시간 변경 시 자동 계산
  useEffect(() => {
    if (enterTime) {
      setLeaveTime(calculateLeaveTime(enterTime, classDuration));
    }
  }, [enterTime, classDuration]);

  // 학생 추가
  const addStudent = async () => {
    if (!name.trim() || !enterTime) {
      alert('학생 이름과 시간을 입력하세요.');
      return;
    }

    try {
      await addDoc(collection(db, 'students'), {
        name: name.trim(),
        enterTime,
        leaveTime,
        classDuration: Number(classDuration),
        studentCode: crypto.randomUUID(),
        status: STATUS.STUDY,
        createdAt: Date.now(),
      });

      setName('');
      setEnterTime('');
      setClassDuration(90);
      setLeaveTime('');
    } catch (error) {
      console.error(error);
      alert('학생 등록 실패');
    }
  };

  // 학생 삭제
  const removeStudent = async (id) => {
    const ok = confirm('학생을 삭제할까요?');

    if (!ok) return;

    await deleteDoc(doc(db, 'students', id));
  };

  // 상태 변경
  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, 'students', id), {
      status,
    });
  };

  // 수정 시작
  const startEdit = (student) => {
    setEditingId(student.id);
    setEditName(student.name);
    setEditTime(student.enterTime);
    setStudentClassDuration(student.classDuration || 90);
    setStudentCustomLeaveTime(student.leaveTime || '');
  };

  // 수정 저장
  const saveEdit = async () => {
    await updateDoc(doc(db, 'students', editingId), {
      name: editName,
      enterTime: editTime,
      leaveTime: studentCustomLeaveTime || calculateLeaveTime(editTime, studentClassDuration),
      classDuration: Number(studentClassDuration),
    });

    setEditingId(null);
  };

  // 하루 초기화
  const resetAll = async () => {
    const ok = confirm('오늘 데이터를 모두 삭제할까요?');

    if (!ok) return;

    for (const student of students) {
      await deleteDoc(doc(db, 'students', student.id));
    }

    alert('초기화 완료');
  };

  // 학부모 링크 복사
  const copyParentLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('학부모 링크가 복사되었습니다. 카톡으로 공유하세요.');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      alert('학부모 링크가 복사되었습니다. 카톡으로 공유하세요.');
    }
  };

  // 현황 복사
  const copyStatus = async () => {
    const text = filteredStudents
      .map(
        (student) =>
          `${student.name} | ${student.status} | 하원 ${student.leaveTime}`
      )
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      alert('복사되었습니다. 카톡에 붙여넣기 하세요.');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      alert('복사되었습니다. 카톡에 붙여넣기 하세요.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 p-4 md:p-8 text-slate-900">
      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-10">
        <div className="text-center mb-10">
          <div className="text-slate-500 font-semibold text-lg mb-3">
            Smart Academy Attendance System
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-blue-700 mb-4">
            광교나무미술
          </h1>

          <div className="text-xl md:text-2xl font-bold text-slate-700">
            {isParentMode ? '학생 하원 현황' : '실시간 학생 현황판'}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-6 py-5 shadow-sm">
              <div className="text-slate-500 text-sm font-semibold mb-2">
                📅 오늘 날짜
              </div>
              <div className="text-2xl md:text-3xl font-black text-blue-700">
                {(() => {
                  const now = new Date();
                  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
                  const year = now.getFullYear();
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  const day = String(now.getDate()).padStart(2, '0');
                  const weekday = weekdays[now.getDay()];

                  return `${year}/${month}/${day} (${weekday})`;
                })()}
              </div>
            </div>

            <div className="bg-cyan-50 border border-cyan-200 rounded-2xl px-6 py-5 shadow-sm">
              <div className="text-slate-500 text-sm font-semibold mb-2">
                👨‍🎓 등원 학생 수
              </div>
              <div className="text-2xl md:text-3xl font-black text-cyan-700">
                {students.length}명
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-5 shadow-sm">
              <div className="text-slate-500 text-sm font-semibold mb-2">
                ⏰ 현재 시간
              </div>
              <div className="text-2xl md:text-3xl font-black text-orange-600">
                {currentTime}
              </div>
            </div>
          </div>
        </div>

        {!isParentMode && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="학생 이름"
              className="bg-white border-2 border-slate-300 rounded-2xl px-4 py-4 text-lg font-semibold"
            />

            <input
              type="time"
              value={enterTime}
              onChange={(e) => setEnterTime(e.target.value)}
              className="bg-white border-2 border-slate-300 rounded-2xl px-4 py-4 text-lg font-semibold"
            />

            <select
              value={classDuration}
              onChange={(e) => setClassDuration(e.target.value)}
              className="bg-white border-2 border-slate-300 rounded-2xl px-4 py-4 text-lg font-semibold"
            >
              <option value={90}>일반반 90분</option>
              <option value={180}>연강반 180분</option>
              <option value={240}>입시반 240분</option>
            </select>

            <input
              type="time"
              value={leaveTime}
              onChange={(e) => setLeaveTime(e.target.value)}
              className="bg-white border-2 border-slate-300 rounded-2xl px-4 py-4 text-lg font-semibold"
            />

            <button
              onClick={addStudent}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-4 py-4 font-bold text-lg"
            >
              ＋ 학생 추가
            </button>

            <button
              onClick={copyStatus}
              className="bg-cyan-500 hover:bg-cyan-400 text-white rounded-2xl px-4 py-4 font-bold text-lg"
            >
              📋 전체 현황 복사
            </button>

            <button
              onClick={resetAll}
              className="bg-red-500 hover:bg-red-400 text-white rounded-2xl px-4 py-4 font-bold text-lg"
            >
              🧹 하루 초기화
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
              <tr>
                <th className="py-5 text-lg">학생</th>
                <th className="py-5 text-lg">등원</th>
                <th className="py-5 text-lg">수업</th>
                <th className="py-5 text-lg">하원</th>
                <th className="py-5 text-lg">상태</th>
                {!isParentMode && (
                  <>
                    <th className="py-5 text-lg">QR</th>
                    <th className="py-5 text-lg">관리</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => {
                const qrUrl = `${window.location.origin}/?id=${student.studentCode}`;

                return (
                  <tr
                    key={student.id}
                    className="border-b border-slate-200 bg-white hover:bg-slate-50"
                  >
                    <td className="py-6 px-4 text-center text-2xl font-bold">
                      {editingId === student.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-white border-2 border-slate-300 rounded-xl px-3 py-2 font-semibold w-40"
                        />
                      ) : (
                        student.name
                      )}
                    </td>

                    <td className="py-6 px-4 text-center text-xl text-cyan-600 font-bold">
                      {editingId === student.id ? (
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="bg-white border-2 border-slate-300 rounded-xl px-3 py-2 font-semibold"
                        />
                      ) : (
                        student.enterTime
                      )}
                    </td>

                    <td className="py-6 px-4 text-center text-lg font-bold text-slate-600">
                      {student.classDuration || 90}분
                    </td>

                    <td className="py-6 px-4 text-center text-2xl text-orange-500 font-black">
                      {student.leaveTime}
                    </td>

                    <td className="py-6 px-4 text-center">
                      <div
                        className={`inline-block px-5 py-3 rounded-2xl font-bold text-white ${
                          student.status === STATUS.STUDY
                            ? 'bg-blue-600'
                            : student.status === STATUS.RIDING
                            ? 'bg-yellow-400 text-black'
                            : 'bg-green-600'
                        }`}
                      >
                        {student.status}
                      </div>

                      {!isParentMode && (
                        <div className="flex flex-wrap justify-center gap-2 mt-3">
                          <button
                            onClick={() => updateStatus(student.id, STATUS.STUDY)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-sm font-bold"
                          >
                            수업중
                          </button>

                          <button
                            onClick={() => updateStatus(student.id, STATUS.RIDING)}
                            className="bg-yellow-400 hover:bg-yellow-300 text-black px-3 py-2 rounded-xl text-sm font-bold"
                          >
                            차량탑승
                          </button>

                          <button
                            onClick={() => updateStatus(student.id, STATUS.COMPLETE)}
                            className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-xl text-sm font-bold"
                          >
                            귀가완료
                          </button>
                        </div>
                      )}
                    </td>

                    {!isParentMode && (
                      <td className="py-6 px-4 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <QRCodeCanvas value={qrUrl} size={90} />

                          <a
                            href={qrUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 text-sm break-all hover:underline"
                          >
                            학부모 링크
                          </a>

                          <button
                            onClick={() => copyParentLink(qrUrl)}
                            className="bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-2 rounded-xl text-sm font-bold"
                          >
                            📋 링크 복사
                          </button>
                        </div>
                      </td>
                    )}

                    {!isParentMode && (
                      <td className="py-6 px-4 text-center">
                        <div className="flex flex-col gap-2 items-center">
                          {editingId === student.id ? (
                            <button
                              onClick={saveEdit}
                              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold"
                            >
                              💾 저장
                            </button>
                          ) : (
                            <button
                              onClick={() => startEdit(student)}
                              className="bg-cyan-500 hover:bg-cyan-400 text-white px-4 py-2 rounded-xl font-bold"
                            >
                              ✏ 수정
                            </button>
                          )}

                          <button
                            onClick={() => removeStudent(student.id)}
                            className="bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-xl font-bold"
                          >
                            🗑 삭제
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-10 text-center text-slate-500 text-sm">
          © 2026 광교나무미술 · 학생 등·하원 관리 시스템
        </div>
      </div>
    </div>
  );
}
