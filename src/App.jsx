import React, { useEffect, useState } from "react";

// Vercel 배포용 React 앱
// 사용 방법:
// 1. Vite React 프로젝트 생성
// 2. 이 파일을 src/App.jsx 로 저장
// 3. npm install
// 4. npm run dev
// 5. GitHub 업로드 후 Vercel 배포

export default function PickupBoardApp() {
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [students, setStudents] = useState([]);
  const [currentTime, setCurrentTime] = useState("");
  const [notifiedStudents, setNotifiedStudents] = useState([]);

  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission !== "granted"
    ) {
      Notification.requestPermission();
    }

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

  const calculateLeaveTime = (startTime) => {
    if (!startTime || !startTime.includes(":")) {
      return "--:--";
    }

    const [hours, minutes] = startTime.split(":").map(Number);

    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);

    date.setMinutes(date.getMinutes() + 90);

    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");

    return `${hh}:${mm}`;
  };

  const addStudent = () => {
    if (!name.trim() || !time) {
      return;
    }

    const leaveTime = calculateLeaveTime(time);

    const newStudent = {
      id: Date.now(),
      name: name.trim(),
      enterTime: time,
      leaveTime,
    };

    setStudents((prev) => [newStudent, ...prev]);

    setName("");
    setTime("");
  };

  useEffect(() => {
    const notificationTimer = setInterval(() => {
      const now = new Date();

      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      students.forEach((student) => {
        if (
          student.leaveTime === currentHHMM &&
          !notifiedStudents.includes(student.id)
        ) {
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            new Notification("학생 하원 알림", {
              body: `${student.name} 학생의 하원 시간입니다.`,
            });
          }

          setNotifiedStudents((prev) => [...prev, student.id]);
        }
      });
    }, 1000);

    return () => clearInterval(notificationTimer);
  }, [students, notifiedStudents]);

  const removeStudent = (id) => {
    setStudents((prev) => prev.filter((student) => student.id !== id));
  };

  return (
    <div className="min-h-screen bg-black text-white flex justify-center p-6">
      <div className="w-full max-w-6xl">
        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl p-6">
          <h1 className="text-5xl font-extrabold text-center text-yellow-400 tracking-widest mb-3">
            학원 하원 전광판
          </h1>

          <p className="text-center text-zinc-400 text-lg mb-8">
            학생 이름과 등원 시간을 입력하면 자동으로 1시간 30분 후 하원 시간이 표시됩니다.
          </p>

          <div className="grid md:grid-cols-4 gap-4 mb-8">
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
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-2xl px-4 py-4 text-lg transition-all duration-200"
            >
              학생 추가
            </button>

            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-4 text-center">
              <div className="text-sm text-zinc-400 mb-1">현재 시간</div>
              <div className="text-2xl font-bold text-green-400 font-mono">
                {currentTime}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-zinc-700">
            <table className="w-full text-center">
              <thead className="bg-zinc-800 text-yellow-400">
                <tr>
                  <th className="py-5 text-xl">학생 이름</th>
                  <th className="py-5 text-xl">등원 시간</th>
                  <th className="py-5 text-xl">하원 시간</th>
                  <th className="py-5 text-xl">관리</th>
                </tr>
              </thead>

              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="py-16 text-zinc-500 text-2xl bg-black"
                    >
                      등록된 학생이 없습니다.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-t border-zinc-700 bg-black hover:bg-zinc-900 transition-all"
                    >
                      <td className="py-6 text-3xl font-bold tracking-wide">
                        {student.name}
                      </td>

                      <td className="py-6 text-2xl text-cyan-400 font-mono">
                        {student.enterTime}
                      </td>

                      <td className="py-6 text-4xl font-extrabold text-red-500 font-mono animate-pulse">
                        {student.leaveTime}
                      </td>

                      <td className="py-6">
                        <button
                          onClick={() => removeStudent(student.id)}
                          className="bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-xl font-semibold transition-all"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-center text-zinc-500 text-sm">
            전광판 스타일 학원 하원 관리 시스템 · 푸쉬 알림 지원
          </div>

          {/* 테스트 예시 */}
          <div className="mt-10 bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-xl font-bold text-yellow-400 mb-3">
              테스트 예시
            </h2>

            <ul className="space-y-2 text-zinc-300">
              <li>09:00 입력 → 10:30 하원</li>
              <li>13:40 입력 → 15:10 하원</li>
              <li>23:30 입력 → 01:00 하원</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
