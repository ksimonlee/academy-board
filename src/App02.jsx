import React, { useEffect, useState } from "react";

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
      alert("학생 이름과 시간을 입력하세요.");
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

  const copyStatusToClipboard = () => {
    if (students.length === 0) {
      alert("복사할 학생 정보가 없습니다.");
      return;
    }

    const statusText = students
      .map((student, index) => {
        return `${index + 1}. ${student.name} | 등원 ${student.enterTime} | 하원 ${student.leaveTime}`;
      })
      .join("\n");

    const finalText = `[학원 하원 현황]\n\n${statusText}`;

    try {
      const textArea = document.createElement("textarea");

      textArea.value = finalText;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "absolute";
      textArea.style.left = "-9999px";

      document.body.appendChild(textArea);

      textArea.select();
      textArea.setSelectionRange(0, 99999);

      const success = document.execCommand("copy");

      document.body.removeChild(textArea);

      if (success) {
        alert("복사 되었습니다. 카톡에 붙여 넣기 하세요.");
      } else {
        alert("복사 실패");
      }
    } catch (error) {
      console.error(error);
      alert("브라우저에서 복사를 허용하지 않았습니다.");
    }
  };

  const removeStudent = (id) => {
    setStudents((prev) => prev.filter((student) => student.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white flex justify-center p-4 md:p-6">
      <div className="w-full max-w-6xl">
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700 rounded-[32px] shadow-2xl p-4 md:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-zinc-500 text-sm uppercase tracking-[0.3em] mb-2">
                Academy Smart Board
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold text-yellow-400 tracking-widest">
                학원 하원 전광판
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-2xl border border-zinc-700">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-green-400 font-semibold">LIVE</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-400/10 to-red-500/10 border border-yellow-500/20 rounded-3xl p-4 mb-6">
            <p className="text-center text-zinc-300 text-lg md:text-xl leading-relaxed">
              학생 이름과 등원 시간을 입력하면 자동으로 1시간 30분 후 하원 시간이 표시됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="학생 이름"
              className="bg-zinc-800/80 border border-zinc-600 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-yellow-400 shadow-inner"
            />

            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-zinc-800/80 border border-zinc-600 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-yellow-400 shadow-inner"
            />

            <button
              onClick={addStudent}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-2xl px-4 py-4 text-lg transition-all duration-200"
            >
              ➕ 학생 추가
            </button>

            <button
              onClick={copyStatusToClipboard}
              className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-2xl px-4 py-4 text-lg transition-all duration-200"
            >
              📋 현황 복사
            </button>

            <div className="bg-zinc-800/80 border border-zinc-700 rounded-2xl px-4 py-4 text-center shadow-inner">
              <div className="text-sm text-zinc-400 mb-1">현재 시간</div>
              <div className="text-2xl font-bold text-green-400 font-mono">
                {currentTime}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-zinc-700 shadow-2xl bg-black/40 overflow-x-auto">
            <table className="w-full text-center min-w-[700px]">
              <thead className="bg-gradient-to-r from-zinc-800 to-zinc-900 text-yellow-400">
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
                      className="border-t border-zinc-800 bg-black/70 hover:bg-zinc-900 transition-all duration-300"
                    >
                      <td className="py-6 text-2xl md:text-3xl font-bold tracking-wide">
                        {student.name}
                      </td>

                      <td className="py-6 text-xl md:text-2xl text-cyan-400 font-mono">
                        {student.enterTime}
                      </td>

                      <td className="py-6 text-3xl md:text-5xl font-extrabold text-red-500 font-mono animate-pulse drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]">
                        {student.leaveTime}
                      </td>

                      <td className="py-6">
                        <button
                          onClick={() => removeStudent(student.id)}
                          className="bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-xl font-semibold transition-all"
                        >
                          🗑 삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-zinc-800/70 border border-zinc-700 rounded-2xl p-4 text-center">
              <div className="text-zinc-500 text-sm">등록 학생</div>
              <div className="text-3xl font-bold text-cyan-400">
                {students.length}
              </div>
            </div>

            <div className="bg-zinc-800/70 border border-zinc-700 rounded-2xl p-4 text-center">
              <div className="text-zinc-500 text-sm">알림 상태</div>
              <div className="text-2xl font-bold text-green-400">ON</div>
            </div>

            <div className="bg-zinc-800/70 border border-zinc-700 rounded-2xl p-4 text-center">
              <div className="text-zinc-500 text-sm">시스템</div>
              <div className="text-2xl font-bold text-yellow-400">LIVE</div>
            </div>
          </div>

          <div className="mt-6 text-center text-zinc-500 text-sm">
            전광판 스타일 학원 하원 관리 시스템 · 푸쉬 알림 지원
          </div>
        </div>
      </div>
    </div>
  );
}
