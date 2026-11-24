<template>
  <div>
    <nav :class="{ 'has-custom-titlebar': hasCustomTitlebar }">
      <Win32Titlebar v-if="enableWin32Titlebar" />
      <LinuxTitlebar v-if="enableLinuxTitlebar" />
      <div class="left-part">
        <div class="search-box">
          <div class="container" :class="{ active: inputFocus }">
            <svg-icon icon-class="search" />
            <div class="input">
              <input
                ref="searchInput"
                v-model="keywords"
                type="search"
                :placeholder="inputFocus ? '' : $t('nav.search')"
                @keydown.enter="doSearch"
                @focus="inputFocus = true"
                @blur="inputFocus = false"
              />
            </div>
          </div>
        </div>
        <div class="navigation-buttons">
          <button-icon @click.native="go('back')"
            ><svg-icon icon-class="arrow-left"
          /></button-icon>
          <button-icon @click.native="go('forward')"
            ><svg-icon icon-class="arrow-right"
          /></button-icon>
        </div>
      </div>
      <div class="navigation-links">
        <router-link
          :to="{ name: 'library' }"
          :class="{ active: $route.name === 'library' }"
          >{{ $t('nav.library') }}</router-link
        >
      </div>
      <div class="right-part">
        <div class="nav-menu">
          <button
            class="nav-toggle"
            :class="{ open: isNavMenuOpen }"
            type="button"
            :aria-expanded="isNavMenuOpen.toString()"
            aria-label="更多导航"
            @click="toggleNavMenu"
          >
            <span class="chevron">^</span>
          </button>
        </div>
        <img
          class="avatar"
          :src="avatarUrl"
          loading="lazy"
          @click="showUserProfileMenu"
        />
      </div>
      <div v-show="isNavMenuOpen" class="nav-dropdown">
        <router-link
          :to="{ name: 'daily' }"
          :class="{ active: $route.name === 'daily' }"
          @click.native="closeNavMenu"
          >每日推荐</router-link
        >
        <router-link
          to="/explore"
          :class="{ active: $route.name === 'explore' }"
          @click.native="closeNavMenu"
          >{{ $t('nav.explore') }}</router-link
        >
        <router-link
          :to="{ name: 'binleng' }"
          :class="{ active: $route.name === 'binleng' }"
          @click.native="closeNavMenu"
          >彬冷的心</router-link
        >
      </div>
    </nav>

    <ContextMenu ref="userProfileMenu">
      <div class="item" @click="toSettings">
        <svg-icon icon-class="settings" />
        {{ $t('library.userProfileMenu.settings') }}
      </div>
      <div v-if="!isLooseLoggedIn" class="item" @click="toLogin">
        <svg-icon icon-class="login" />
        {{ $t('login.login') }}
      </div>
      <div v-if="isLooseLoggedIn" class="item" @click="logout">
        <svg-icon icon-class="logout" />
        {{ $t('library.userProfileMenu.logout') }}
      </div>
      <hr />
      <div class="item" @click="toGithub">
        <svg-icon icon-class="github" />
        {{ $t('nav.github') }}
      </div>
    </ContextMenu>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { isLooseLoggedIn, doLogout } from '@/utils/auth';

// import icons for win32 title bar
// icons by https://github.com/microsoft/vscode-codicons
import 'vscode-codicons/dist/codicon.css';

import Win32Titlebar from '@/components/Win32Titlebar.vue';
import LinuxTitlebar from '@/components/LinuxTitlebar.vue';
import ContextMenu from '@/components/ContextMenu.vue';
import ButtonIcon from '@/components/ButtonIcon.vue';

export default {
  name: 'Navbar',
  components: {
    Win32Titlebar,
    LinuxTitlebar,
    ButtonIcon,
    ContextMenu,
  },
  data() {
    return {
      inputFocus: false,
      langs: ['zh-CN', 'zh-TW', 'en', 'tr'],
      keywords: '',
      enableWin32Titlebar: false,
      enableLinuxTitlebar: false,
      isNavMenuOpen: false,
    };
  },
  computed: {
    ...mapState(['settings', 'data']),
    isLooseLoggedIn() {
      return isLooseLoggedIn();
    },
    hasCustomTitlebar() {
      return this.enableWin32Titlebar || this.enableLinuxTitlebar;
    },
    avatarUrl() {
      return this.data?.user?.avatarUrl
        ? `${this.data?.user?.avatarUrl}?param=512y512`
        : 'https://p2.music.126.net/VnZiScyynLG7atLIZ2YPp9g==/18686200157837544.jpg';
    },
  },
  watch: {
    $route() {
      this.isNavMenuOpen = false;
    },
  },
  created() {
    if (process.platform === 'win32' && this.settings.enableWin32Titlebar) {
      this.enableWin32Titlebar = true;
    } else if (
      process.platform === 'linux' &&
      this.settings.enableLinuxTitlebar
    ) {
      this.enableLinuxTitlebar = true;
    }
  },
  methods: {
    go(where) {
      if (where === 'back') this.$router.go(-1);
      else this.$router.go(1);
    },
    doSearch() {
      if (!this.keywords) return;
      if (
        this.$route.name === 'search' &&
        this.$route.params.keywords === this.keywords
      )
        return;
      this.$router.push({
        name: 'search',
        params: { keywords: this.keywords },
      });
      this.$refs.searchInput.blur();
    },
    toggleNavMenu() {
      this.isNavMenuOpen = !this.isNavMenuOpen;
    },
    closeNavMenu() {
      this.isNavMenuOpen = false;
    },
    toSettings() {
      this.$router.push({ name: 'settings' });
      this.$refs.userProfileMenu.closeMenu();
    },
    toLogin() {
      this.$router.push({ name: 'login' });
      this.$refs.userProfileMenu.closeMenu();
    },
    logout() {
      if (!confirm(this.$t('library.userProfileMenu.logoutConfirm'))) return;
      doLogout();
      this.$toast(this.$t('library.userProfileMenu.logoutSuccess'));
      this.$refs.userProfileMenu.closeMenu();
    },
    toGithub() {
      window.open('https://github.com/qier222/YesPlayMusic');
    },
    showUserProfileMenu(e) {
      this.$refs.userProfileMenu.openMenu(e);
    },
  },
};
</script>

<style lang="scss" scoped>
nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
  padding: 0 10vw;
  -webkit-app-region: drag;
  background-color: var(--color-navbar-bg);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  backdrop-filter: saturate(180%) blur(20px);
  z-index: 100;
}

@supports (-moz-appearance: none) {
  nav {
    background-color: var(--color-body-bg);
  }
}

nav.has-custom-titlebar {
  padding-top: 20px;
  height: 84px;
}

.left-part {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}

.navigation-buttons {
  display: flex;
  align-items: center;
  margin-left: 12px;
  .svg-icon {
    height: 24px;
    width: 24px;
  }
  button {
    height: 32px;
    width: 32px;
  }
}

.navigation-links {
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  justify-content: center;
  transform: translate(-50%, -50%);
  text-transform: uppercase;
  user-select: none;
  a {
    font-size: 18px;
    font-weight: 700;
    text-decoration: none;
    border-radius: 6px;
    padding: 6px 10px;
    color: var(--color-text);
    transition: 0.2s;
    white-space: nowrap;
    -webkit-app-region: no-drag;
    &:hover {
      background: var(--color-secondary-bg-for-transparent);
    }
    &:active {
      transform: scale(0.92);
    }
    &.active {
      color: var(--color-primary);
    }
  }
}

.nav-menu {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.nav-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text);
  font-family: inherit;
  cursor: pointer;
  -webkit-app-region: no-drag;
  transition: 0.2s;
  &:hover {
    background: var(--color-secondary-bg-for-transparent);
  }
  &:active {
    transform: scale(0.92);
  }
  .chevron {
    display: inline-block;
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    transition: transform 0.2s;
  }
  &.open .chevron {
    transform: rotate(180deg);
  }
}

.nav-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 10vw;
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: 6px;
  border-radius: 12px;
  background-color: var(--color-navbar-bg);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  backdrop-filter: saturate(180%) blur(20px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  z-index: 101;
  -webkit-app-region: no-drag;
  a {
    font-size: 16px;
    font-weight: 700;
    text-decoration: none;
    border-radius: 8px;
    padding: 10px 12px;
    color: var(--color-text);
    transition: 0.2s;
    white-space: nowrap;
    -webkit-app-region: no-drag;
    &:hover {
      background: var(--color-secondary-bg-for-transparent);
    }
    &:active {
      transform: scale(0.96);
    }
    &.active {
      color: var(--color-primary);
    }
  }
}

.search-box {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 1;
  min-width: 0;
  .container {
    display: flex;
    align-items: center;
    height: 32px;
    width: 200px;
    max-width: 100%;
    border-radius: 8px;
    background: var(--color-secondary-bg-for-transparent);
    transition: 0.2s;
    .svg-icon {
      height: 15px;
      width: 15px;
      color: var(--color-text);
      margin-left: 10px;
      margin-right: 6px;
    }
    input {
      font-size: 16px;
      border: none;
      background: transparent;
      width: 96%;
      font-weight: 600;
      color: var(--color-text);
      &::placeholder {
        color: var(--color-text);
        opacity: 0.28;
      }
    }
    &.active {
      background: var(--color-primary-bg-for-transparent);
      input,
      .svg-icon {
        opacity: 1;
        color: var(--color-primary);
      }
    }
  }
}

.right-part {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  .avatar {
    user-select: none;
    height: 30px;
    margin-left: 12px;
    border-radius: 50%;
    cursor: pointer;
    -webkit-app-region: no-drag;
    &:hover {
      filter: brightness(80%);
    }
  }
}

@media (max-width: 1336px) {
  nav {
    padding: 0 max(5vw, 90px);
  }
  .nav-dropdown {
    right: max(5vw, 90px);
  }
}

@media (max-width: 970px) {
  .navigation-buttons {
    flex: unset;
  }
}

@media (max-width: 768px) {
  nav {
    padding: 0 12px;
  }
  .navigation-buttons {
    display: none;
  }
  .navigation-links a {
    font-size: 16px;
    padding: 6px 6px;
    margin-right: 6px;
    margin-left: 6px;
  }
  .search-box .container {
    width: 140px;
  }
  .nav-dropdown {
    right: 12px;
  }
}

@media (max-width: 480px) {
  nav {
    padding: 0 10px;
  }
  .navigation-links a {
    font-size: 16px;
    padding: 6px 4px;
    margin-right: 2px;
    margin-left: 2px;
  }
  .search-box .container {
    width: 108px;
  }
  .search-box input {
    font-size: 14px;
  }
  .nav-toggle {
    width: 28px;
    height: 28px;
  }
  .right-part .avatar {
    height: 28px;
    margin-left: 8px;
  }
  .nav-dropdown {
    right: 10px;
    min-width: 140px;
  }
}
</style>
