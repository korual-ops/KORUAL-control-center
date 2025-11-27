/****************************************
 * KORUAL CONTROL CENTER – notifications.js v1.0
 * - 알림(Notification) 시스템
 * - ROUTES.key = "notifications" 시트 필요
 * - 필요 컬럼: id, 타입, 내용, 날짜, 상태(read/unread)
 ****************************************/

(function () {
  const POLL_INTERVAL = 10000; // 10초마다 새 알림 확인
  let lastCheckTime = Date.now();
  let notificationsCache = [];

  const bellBtn = document.getElementById("notif-bell");
  const notifBadge = document.getElementById("notif-badge");

  function playSound() {
    const audio = new Audio("/sounds/notify.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }

  function openNotificationModal() {
    const modal = document.getElementById("notif-modal");
    modal.classList.add("open");
  }

  function closeNotificationModal() {
    const modal = document.getElementById("notif-modal");
    modal.classList.remove("open");
  }

  function formatDate(v) {
    if (!v) return "";
    try {
      const d = new Date(v);
      return `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} 
              ${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    } catch {
      return v;
    }
  }

  async function fetchNotifications() {
    try {
      const data = await apiGet({ target: "notifications" });
      if (!data.ok) return [];

      const rows = data.rows || [];
      return rows.map(r => ({
        id: r.id,
        typ
