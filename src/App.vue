<template>
  <div id="app" :class="{ 'user-select-none': userSelectNone }">
    <div v-if="!pinUnlocked" class="pin-gate">
      <div class="pin-gate-card">
        <div class="pin-gate-title">咪头Music</div>
        <div class="pin-gate-subtitle">请输入 4 位 PIN 码解锁</div>
        <div class="pin-dots" :class="{ 'pin-dots-error': pinError }">
          <span
            v-for="index in 4"
            :key="index"
            class="pin-dot"
            :class="{ 'pin-dot-filled': index <= pinInput.length }"
          ></span>
        </div>
        <p v-if="pinLocked" class="pin-message pin-message-error">
          尝试次数过多，请等待 {{ pinLockRemaining }} 秒后重试
        </p>
        <p v-else-if="pinError" class="pin-message pin-message-error">
          PIN 码错误，请重试
        </p>
        <p v-else class="pin-message">输入 4 位数字后自动验证</p>
        <div class="pin-keypad">
          <button
            v-for="key in pinKeys"
            :key="key"
            type="button"
            class="pin-key"
            :disabled="pinLocked"
            @click="pressPinKey(key)"
          >
            {{ key }}
          </button>
          <span class="pin-key pin-key-empty"></span>
          <button
            type="button"
            class="pin-key"
            :disabled="pinLocked"
            @click="pressPinKey('0')"
          >
            0
          </button>
          <button
            type="button"
            class="pin-key pin-key-delete"
            :disabled="pinLocked"
            @click="deletePinKey"
          >
            删除
          </button>
        </div>
        <div class="pin-gate-tip">本设备解锁后不再重复输入</div>
      </div>
    </div>
    <template v-else>
      <Scrollbar v-show="!showLyrics" ref="scrollbar" />
      <Navbar v-show="showNavbar" ref="navbar" />
      <main
        ref="main"
        :style="{ overflow: enableScrolling ? 'auto' : 'hidden' }"
        @scroll="handleScroll"
      >
        <keep-alive>
          <router-view v-if="$route.meta.keepAlive"></router-view>
        </keep-alive>
        <router-view v-if="!$route.meta.keepAlive"></router-view>
      </main>
      <transition name="slide-up">
        <Player v-if="enablePlayer" v-show="showPlayer" ref="player" />
      </transition>
      <Toast />
      <ModalAddTrackToPlaylist v-if="isAccountLoggedIn" />
      <ModalNewPlaylist v-if="isAccountLoggedIn" />
      <transition v-if="enablePlayer" name="slide-up">
        <Lyrics v-show="showLyrics" />
      </transition>
    </template>
  </div>
</template>

<script>
import ModalAddTrackToPlaylist from './components/ModalAddTrackToPlaylist.vue';
import ModalNewPlaylist from './components/ModalNewPlaylist.vue';
import Scrollbar from './components/Scrollbar.vue';
import Navbar from './components/Navbar.vue';
import Player from './components/Player.vue';
import Toast from './components/Toast.vue';
import { ipcRenderer } from './electron/ipcRenderer';
import { isAccountLoggedIn, isLooseLoggedIn } from '@/utils/auth';
import { mapState } from 'vuex';

// 歌词页体积不小（还带着取色库），只有点了「歌词」才会用到，
// 改成异步组件，让它从首屏包里移出去。
const Lyrics = () =>
  import(/* webpackChunkName: "view-lyrics" */ '@/views/lyrics.vue');

const PIN_CODE = '0725';
const PIN_STORAGE_KEY = 'yesplaymusic-pin-unlocked';
const PIN_LOCK_KEY = 'yesplaymusic-pin-locked-until';
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_SECONDS = 30;

export default {
  name: 'App',
  components: {
    Navbar,
    Player,
    Toast,
    ModalAddTrackToPlaylist,
    ModalNewPlaylist,
    Lyrics,
    Scrollbar,
  },
  data() {
    return {
      isElectron: process.env.IS_ELECTRON, // true || undefined
      userSelectNone: false,
      pinUnlocked: false,
      pinInput: '',
      pinError: false,
      pinAttempts: 0,
      pinLockRemaining: 0,
      pinLockTimer: null,
      pinKeys: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    };
  },
  computed: {
    ...mapState(['showLyrics', 'settings', 'player', 'enableScrolling']),
    isAccountLoggedIn() {
      return isAccountLoggedIn();
    },
    showPlayer() {
      return (
        [
          'mv',
          'playlist',
          'album',
          'artist',
          'search',
          'daily',
          'explore',
          'library',
          'liked',
          'settings',
        ].includes(this.$route.name) && this.$route.query.id !== 'to_be_played'
      );
    },
    enablePlayer() {
      return this.player.enabled;
    },
    showNavbar() {
      return this.$route.name !== 'lyrics';
    },
    pinLocked() {
      return this.pinLockRemaining > 0;
    },
  },
  created() {
    if (this.isElectron) ipcRenderer(this);
    window.addEventListener('keydown', this.handleKeydown);
    this.fetchData();
    this.initPinGate();
  },
  beforeDestroy() {
    if (this.pinLockTimer) {
      clearInterval(this.pinLockTimer);
      this.pinLockTimer = null;
    }
  },
  methods: {
    handleKeydown(e) {
      if (!this.pinUnlocked) {
        if (e.key >= '0' && e.key <= '9') {
          this.pressPinKey(e.key);
        } else if (e.key === 'Backspace') {
          this.deletePinKey();
        }
        return;
      }
      if (e.code === 'Space') {
        if (e.target.tagName === 'INPUT') return;
        e.preventDefault();
        this.player.playOrPause();
      }
    },
    initPinGate() {
      try {
        this.pinUnlocked = localStorage.getItem(PIN_STORAGE_KEY) === '1';
      } catch (e) {
        this.pinUnlocked = false;
      }
      if (this.pinUnlocked) return;
      try {
        const lockedUntil = Number(localStorage.getItem(PIN_LOCK_KEY));
        if (lockedUntil > Date.now()) {
          this.pinLockRemaining = Math.ceil((lockedUntil - Date.now()) / 1000);
          this.startPinLockTimer();
        }
      } catch (e) {
        this.pinLockRemaining = 0;
      }
    },
    pressPinKey(key) {
      if (this.pinUnlocked || this.pinLocked) return;
      if (this.pinInput.length >= 4) return;
      this.pinError = false;
      this.pinInput += key;
      if (this.pinInput.length === 4) {
        this.checkPin();
      }
    },
    deletePinKey() {
      if (this.pinUnlocked || this.pinLocked) return;
      this.pinError = false;
      this.pinInput = this.pinInput.slice(0, -1);
    },
    checkPin() {
      if (this.pinInput === PIN_CODE) {
        this.pinUnlocked = true;
        this.pinAttempts = 0;
        this.pinError = false;
        this.pinInput = '';
        try {
          localStorage.setItem(PIN_STORAGE_KEY, '1');
          localStorage.removeItem(PIN_LOCK_KEY);
        } catch (e) {
          // localStorage 不可用时，本次会话内仍保持解锁状态
        }
        return;
      }
      this.pinAttempts += 1;
      this.pinError = true;
      if (this.pinAttempts >= PIN_MAX_ATTEMPTS) {
        this.startPinLock();
      }
      setTimeout(() => {
        this.pinInput = '';
        this.pinError = false;
      }, 600);
    },
    startPinLock() {
      this.pinLockRemaining = PIN_LOCK_SECONDS;
      try {
        localStorage.setItem(
          PIN_LOCK_KEY,
          String(Date.now() + PIN_LOCK_SECONDS * 1000)
        );
      } catch (e) {
        // localStorage 不可用时，锁定仅在本次会话内生效
      }
      this.startPinLockTimer();
    },
    startPinLockTimer() {
      if (this.pinLockTimer) {
        clearInterval(this.pinLockTimer);
      }
      this.pinLockTimer = setInterval(() => {
        this.pinLockRemaining -= 1;
        if (this.pinLockRemaining <= 0) {
          this.pinLockRemaining = 0;
          this.pinAttempts = 0;
          clearInterval(this.pinLockTimer);
          this.pinLockTimer = null;
          try {
            localStorage.removeItem(PIN_LOCK_KEY);
          } catch (e) {
            // localStorage 不可用时无需清理
          }
        }
      }, 1000);
    },
    fetchData() {
      if (isAccountLoggedIn()) {
        this.$store.dispatch('fetchLikedSongs');
        if (!isLooseLoggedIn()) {
          this.$store.dispatch('fetchLikedPlaylist');
        }
      }
    },
    handleScroll() {
      this.$refs.scrollbar.handleScroll();
    },
  },
};
</script>

<style lang="scss">
#app {
  width: 100%;
  /* 原来这里是 transition: all 0.4s，切换主题时会把根节点上所有可动画属性
     都过一遍，移动端会有明显掉帧；实际只会变背景色和文字色。 */
  transition: background-color 0.4s, color 0.4s;
}

#app .user-select-none {
  user-select: none;
}

main {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
  overflow: auto;
  padding: 64px 10vw 96px 10vw;
  box-sizing: border-box;
  scrollbar-width: none; /* firefox */
  /* 滚动到顶/底时不再把整页一起拖动（iOS 回弹会串到外层） */
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 1336px) {
  main {
    padding: 64px 5vw 96px 5vw;
  }
}

main::-webkit-scrollbar {
  display: none;
}

.pin-gate {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: var(--color-body-bg);
  color: var(--color-text);
}

.pin-gate-card {
  width: 100%;
  max-width: 320px;
  text-align: center;
}

.pin-gate-title {
  font-size: 28px;
  font-weight: 700;
}

.pin-gate-subtitle {
  margin-top: 8px;
  font-size: 15px;
  color: var(--color-secondary);
}

.pin-dots {
  display: flex;
  justify-content: center;
  gap: 18px;
  margin: 32px 0 16px;
}

.pin-dot {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-secondary);
  border-radius: 50%;
  box-sizing: border-box;
}

.pin-dot-filled {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.pin-dots-error {
  animation: pin-shake 0.4s;
}

.pin-message {
  min-height: 20px;
  margin: 0 0 20px;
  font-size: 14px;
  color: var(--color-secondary);
}

.pin-message-error {
  color: #e5484d;
}

.pin-keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.pin-key {
  height: 64px;
  font-size: 22px;
  color: var(--color-text);
  background: var(--color-secondary-bg);
  border: 0;
  border-radius: 16px;
  cursor: pointer;
}

.pin-key:active {
  background: var(--color-primary-bg);
}

.pin-key:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.pin-key-empty {
  background: transparent;
}

.pin-key-delete {
  font-size: 16px;
}

.pin-gate-tip {
  margin-top: 20px;
  font-size: 13px;
  color: var(--color-secondary);
}

@keyframes pin-shake {
  0% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-8px);
  }
  40% {
    transform: translateX(8px);
  }
  60% {
    transform: translateX(-6px);
  }
  80% {
    transform: translateX(6px);
  }
  100% {
    transform: translateX(0);
  }
}
</style>
