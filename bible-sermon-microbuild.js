(() => {
  'use strict';

  const MINISTRIES = [
    { id: 'insight-for-living', label: 'Insight for Living' },
    { id: 'southeast-christian', label: 'Southeast Christian' },
    { id: 'tony-evans', label: 'Tony Evans' }
  ];

  function installStyles() {
    if (document.getElementById('sermon-microbuild-styles')) return;

    const style = document.createElement('style');
    style.id = 'sermon-microbuild-styles';
    style.textContent = `
      .sermon-source-list {
        display: grid;
        gap: 10px;
        width: 100%;
        margin: 0;
      }

      .sermon-source-button {
        box-sizing: border-box;
        width: 100%;
        min-height: 64px;
        padding: 14px 18px;
        border: 1px solid rgba(255,255,255,.12);
        border-left: 4px solid transparent;
        border-radius: 15px;
        background: #17191d;
        color: #fff;
        font: inherit;
        font-size: clamp(18px, 1.55vw, 23px);
        font-weight: 700;
        line-height: 1.15;
        text-align: left;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        -webkit-tap-highlight-color: transparent;
      }

      .sermon-source-button:hover,
      .sermon-source-button:focus-visible {
        background: rgba(77,163,255,.12);
        outline: none;
      }

      .sermon-source-button.active,
      .sermon-source-button[aria-pressed='true'] {
        border-left-color: #4da3ff;
        background: rgba(29,79,134,.58);
        color: #fff;
      }

      .sermon-reserved-area {
        box-sizing: border-box;
        width: 100%;
        margin-top: 14px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 17px;
        background: rgba(0,0,0,.10);
      }

      .sermon-episode-placeholder {
        flex: 1 1 220px;
        min-height: 220px;
      }

      .sermon-player-placeholder {
        flex: 0 0 92px;
        min-height: 92px;
        margin-bottom: 2px;
      }

      .side-menu.sermon-microbuild-ready {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      @media (max-width: 760px), (max-height: 560px) {
        .sermon-source-list { gap: 8px; }
        .sermon-source-button {
          min-height: 52px;
          padding: 11px 14px;
          border-radius: 13px;
        }
        .sermon-reserved-area { margin-top: 10px; border-radius: 14px; }
        .sermon-episode-placeholder { min-height: 150px; }
        .sermon-player-placeholder { flex-basis: 72px; min-height: 72px; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const sideMenu = document.querySelector('.side-menu');
    if (!sideMenu || sideMenu.dataset.sermonMicrobuild === 'ready') return;

    installStyles();

    sideMenu.querySelectorAll('.menu-item').forEach((item) => item.remove());
    sideMenu.querySelectorAll('.sermon-source-list, .sermon-reserved-area').forEach((item) => item.remove());

    const sourceList = document.createElement('div');
    sourceList.className = 'sermon-source-list';
    sourceList.setAttribute('aria-label', 'Sermon podcasts');

    MINISTRIES.forEach((ministry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sermon-source-button${index === 0 ? ' active' : ''}`;
      button.dataset.ministry = ministry.id;
      button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
      button.textContent = ministry.label;

      button.addEventListener('click', () => {
        sourceList.querySelectorAll('.sermon-source-button').forEach((other) => {
          const selected = other === button;
          other.classList.toggle('active', selected);
          other.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
      });

      sourceList.appendChild(button);
    });

    const episodeArea = document.createElement('section');
    episodeArea.className = 'sermon-reserved-area sermon-episode-placeholder';
    episodeArea.id = 'sermonEpisodeArea';
    episodeArea.setAttribute('aria-label', 'Reserved episode list area');

    const playerArea = document.createElement('section');
    playerArea.className = 'sermon-reserved-area sermon-player-placeholder';
    playerArea.id = 'sermonMiniPlayer';
    playerArea.setAttribute('aria-label', 'Reserved mini player area');

    sideMenu.append(sourceList, episodeArea, playerArea);
    sideMenu.classList.add('sermon-microbuild-ready');
    sideMenu.dataset.sermonMicrobuild = 'ready';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildPanel, { once: true });
  } else {
    buildPanel();
  }
})();
