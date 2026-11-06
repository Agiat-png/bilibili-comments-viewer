(async function() {
  let isFetching = false;

  async function loadComments() {
    if (isFetching) return;
    if (document.getElementById('bili-guest-comments')) return; // 既に表示中なら無視

    // 動画のURLからbvid（ID）を取得 (例: https://www.bilibili.com/video/BV1.../)
    const match = location.pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    if (!match) return;
    const bvid = match[1];

    isFetching = true;
    try {
      // 1. APIを叩いてbvidからaid(oid)という別の内部IDを取得する
      const viewRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
      const viewData = await viewRes.json();
      if (viewData.code !== 0) throw new Error("動画情報の取得に失敗しました");
      const aid = viewData.data.aid;

      // 2. aidを使ってコメントデータを取得する（type=1が動画でのコメント、mode=3が人気のコメント順）
      const replyRes = await fetch(`https://api.bilibili.com/x/v2/reply/main?type=1&oid=${aid}&mode=3`);
      const replyData = await replyRes.json();
      if (replyData.code !== 0) throw new Error("コメントの取得に失敗しました");

      const replies = replyData.data.replies || [];
      renderComments(replies);
    } catch (err) {
      console.error("[Bilibili Guest Comment Viewer] エラー:", err);
    }
    isFetching = false;
  }

  // 画面上にコメント用の四角いUIを作成して表示する関数
  function renderComments(replies) {
    const container = document.createElement('div');
    container.id = 'bili-guest-comments';
    
    // ヘッダー部分
    const header = document.createElement('div');
    header.id = 'bili-guest-comments-header';
    header.innerHTML = `
      <span>コメント (${replies.length})</span>
      <button id="bili-guest-comments-close">×</button>
    `;
    
    // ボディ（コメント一覧）部分
    const body = document.createElement('div');
    body.id = 'bili-guest-comments-body';

    if (replies.length === 0) {
      body.innerHTML = '<div style="color:#aaa; text-align:center; padding: 20px;">コメントが見つかりません。</div>';
    } else {
      replies.forEach(reply => {
        const item = document.createElement('div');
        item.className = 'bili-guest-comment-item';
        
        const user = document.createElement('div');
        user.className = 'bili-guest-comment-user';
        user.textContent = reply.member.uname;

        const text = document.createElement('div');
        text.className = 'bili-guest-comment-text';
        text.textContent = reply.content.message; // Bilibiliのコメント本文

        item.appendChild(user);
        item.appendChild(text);
        body.appendChild(item);
      });
    }

    container.appendChild(header);
    container.appendChild(body);
    document.body.appendChild(container);

    // ドラッグ移動機能の追加
    let isDragging = false;
    let startX, startY;
    let initialX, initialY;

    header.addEventListener('mousedown', (e) => {
      if (e.target.id === 'bili-guest-comments-close') return; // 閉じるボタンではドラッグしない
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = container.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      header.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      container.style.left = `${initialX + dx}px`;
      container.style.top = `${initialY + dy}px`;
      container.style.right = 'auto'; // CSSの固定配置を上書き
      container.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'grab';
      }
    });

    // 閉じるボタンのイベント
    document.getElementById('bili-guest-comments-close').addEventListener('click', (e) => {
      e.stopPropagation(); // 親要素へのイベント伝搬を止める
      e.preventDefault();
      container.remove();
    });
  }

  // ページロード時に実行
  loadComments();

  // Webサイト内でのページ切り替え時にも対応させるための監視（SPA対策）
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const oldBox = document.getElementById('bili-guest-comments');
      if (oldBox) oldBox.remove();
      setTimeout(loadComments, 1500); // ページ切り替え後少し待ってから読み込み
    }
  }).observe(document, { subtree: true, childList: true });

})();
