import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBFMVNEhppIhryGYnCMHvmkSCqdfXucolY",
  authDomain: "academy-board-37bb9.firebaseapp.com",
  projectId: "academy-board-37bb9",
  storageBucket: "academy-board-37bb9.firebasestorage.app",
  messagingSenderId: "425499433220",
  appId: "1:425499433220:web:814cf986e6368257f19851",
  measurementId: "G-57D1ZG6BYK",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function PickupBoardApp() {
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [students, setStudents] = useState([]);
  const [currentTime, setCurrentTime] = useState("");

  // URL 파라미터
  const params = new URLSearchParams(window.location.search);
  const rawStudentName = params.get("student");

  const studentName = rawStudentName
    ? decodeURIComponent(rawStudentName).trim()
    : null;

  // 학부모 모드 여부
  const isParentMode = Boolean(studentName);

  // 학생 필터링
  const filteredStudents = studentName
    ? students.filter((student) => {
        return (
          String(student.name).trim().toLowerCase() ===
          studentName.toLowerCase()
        );
      })
    : students;

  // 실시간 Firebase 동기화
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "students"), (snapshot) => {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      items.sort((a, b) => b.createdAt - a.createdAt);

      setStudents(items);
    });

    return () => unsubscribe();
  }, []);

  // 시계
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateClock();

    const timer = setInterval(updateClock, 1000);

    return () => clearInterval(timer);
  }, []);

  // 하원 시간 계산
  const calculateLeaveTime = (startTime) => {
    if (!startTime || !startTime.includes(":")) {
      return "--:--";
    }

    const [hours, minutes] = startTime.split(":").map(Number);

    const date = new Date();

    date.setHours(hours);
    date.setMinutes(minutes + 90);

    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");

    return `${hh}:${mm}`;
  };

  // 학생 추가
  const addStudent = async () => {
    if (!name.trim() || !time) {
      alert("학생 이름과 시간을 입력하세요.");
      return;
    }

    try {
      await addDoc(collection(db, "students"), {
        name: name.trim(),
        enterTime: time,
        leaveTime: calculateLeaveTime(time),
        status: "학원중",
        createdAt: Date.now(),
      });

      setName("");
      setTime("");
    } catch (error) {
      console.error(error);
      alert("학생 저장 실패");
    }
  };

  // 학생 상태 변경
  const updateStudentStatus = async (id, newStatus) => {
    try {
      const studentRef = doc(db, "students", id);

      await updateDoc(studentRef, {
        status: newStatus,
      });
    } catch (error) {
      console.error(error);
      alert("상태 변경 실패");
    }
  };

  // 학생 삭제
  const removeStudent = async (id) => {
    try {
      await deleteDoc(doc(db, "students", id));
    } catch (error) {
      console.error(error);
      alert("삭제 실패");
    }
  };

  // 현황 복사
  const copyStatusToClipboard = () => {
    if (students.length === 0) {
      alert("복사할 학생 정보가 없습니다.");
      return;
    }

    const text = students
      .map((student, index) => {
        return `${index + 1}. ${student.name} | 등원 ${student.enterTime} | 하원 ${student.leaveTime}`;
      })
      .join("\n");

    const finalText = `[학원 하원 현황]\n\n${text}`;

    const textarea = document.createElement("textarea");

    textarea.value = finalText;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    try {
      document.execCommand("copy");
      alert("복사 되었습니다. 카톡에 붙여 넣기 하세요.");
    } catch (error) {
      console.error(error);
      alert("복사 실패");
    }

    document.body.removeChild(textarea);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white p-4 md:p-6 flex justify-center">
      <div className="w-full max-w-7xl">
        <div className="bg-zinc-900/90 border border-zinc-700 rounded-[32px] p-4 md:p-6 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-zinc-500 text-sm tracking-[0.3em] uppercase mb-2">
                Academy Smart Board
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold text-yellow-400 tracking-widest">
                {isParentMode
                  ? `${studentName} 학생 하원 현황`
                  : "학원 하원 전광판"}
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-2xl">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-green-400 font-bold">LIVE</span>
            </div>
          </div>

          <div className="mb-4 text-center text-zinc-400 text-sm">
            MODE : {studentName || "ALL"} | FILTERED : {filteredStudents.length}
          </div>

          {!isParentMode && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="학생 이름"
                className="bg-zinc-800 border border-zinc-600 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-yellow-400"
              />

              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-zinc-800 border border-zinc-600 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-yellow-400"
              />

              <button
                onClick={addStudent}
                className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-2xl px-4 py-4 text-lg"
              >
                ➕ 학생 추가
              </button>

              <button
                onClick={copyStatusToClipboard}
                className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-2xl px-4 py-4 text-lg"
              >
                📋 현황 복사
              </button>

              <div className="bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-4 text-center">
                <div className="text-sm text-zinc-400 mb-1">현재 시간</div>
                <div className="text-2xl font-bold text-green-400 font-mono">
                  {currentTime}
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-[28px] border border-zinc-700 bg-black/40">
            <table className="w-full min-w-[900px] text-center">
              <thead className="bg-gradient-to-r from-zinc-800 to-zinc-900 text-yellow-400">
                <tr>
                  <th className="py-5 text-xl">학생 이름</th>
                  <th className="py-5 text-xl">등원 시간</th>
                  <th className="py-5 text-xl">하원 시간</th>
                  <th className="py-5 text-xl">상태</th>

                  {!isParentMode && (
                    <th className="py-5 text-xl">학부모 QR</th>
                  )}

                  {!isParentMode && (
                    <th className="py-5 text-xl">관리</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isParentMode ? 3 : 5}
                      className="py-16 text-zinc-500 text-2xl"
                    >
                      등록된 학생이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const qrUrl = `${window.location.origin}/?student=${encodeURIComponent(
                      student.name
                    )}`;

                    return (
                      <tr
                        key={student.id}
                        className="border-t border-zinc-800 bg-black/70 hover:bg-zinc-900"
                      >
                        <td className="py-6 text-2xl md:text-3xl font-bold">
                          {student.name}
                        </td>

                        <td className="py-6 text-xl md:text-2xl text-cyan-400 font-mono">
                          {student.enterTime}
                        </td>

                        <td className="py-6 text-3xl md:text-5xl text-red-500 font-extrabold font-mono">
                          {student.leaveTime}
                        </td>

                        <td className="py-6">
                          <div className="flex flex-col items-center gap-2">
                            <div
                              className={`px-4 py-2 rounded-2xl font-bold text-white text-sm md:text-base ${
                                student.status === "학원중"
                                  ? "bg-blue-500"
                                  : student.status === "차량탑승"
                                  ? "bg-yellow-500 text-black"
                                  : "bg-green-600"
                              }`}
                            >
                              {student.status || "학원중"}
                            </div>

                            {!isParentMode && (
                              <div className="flex flex-wrap justify-center gap-2 mt-2">
                                <button
                                  onClick={() =>
                                    updateStudentStatus(student.id, "학원중")
                                  }
                                  className="bg-blue-500 hover:bg-blue-400 px-3 py-1 rounded-lg text-xs font-bold"
                                >
                                  학원중
                                </button>

                                <button
                                  onClick={() =>
                                    updateStudentStatus(student.id, "차량탑승")
                                  }
                                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1 rounded-lg text-xs font-bold"
                                >
                                  차량탑승
                                </button>

                                <button
                                  onClick={() =>
                                    updateStudentStatus(student.id, "귀가완료")
                                  }
                                  className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded-lg text-xs font-bold"
                                >
                                  귀가완료
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {!isParentMode && (
                          <td className="py-6">
                            <div className="flex flex-col items-center gap-2">
                              <QRCodeCanvas
                                value={qrUrl}
                                size={90}
                                bgColor="#ffffff"
                                fgColor="#000000"
                              />

                              <a
                                href={qrUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 text-xs break-all hover:text-cyan-300"
                              >
                                학부모 전용 링크
                              </a>
                            </div>
                          </td>
                        )}

                        {!isParentMode && (
                          <td className="py-6">
                            <button
                              onClick={() => removeStudent(student.id)}
                              className="bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-xl font-bold"
                            >
                              🗑 삭제
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {isParentMode && (
            <div className="mt-8 bg-green-500/10 border border-green-500/30 rounded-3xl p-6 text-center">
              <div className="text-green-400 text-xl font-bold mb-2">
                실시간 학부모 조회 모드
              </div>

              <div className="text-zinc-300 text-lg">
                학생 상태가 실시간으로 자동 업데이트 됩니다.
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-zinc-500 text-sm">
            Firebase 실시간 공유 학원 하원 관리 시스템
          </div>
        </div>
      </div>
    </div>
  );
}
