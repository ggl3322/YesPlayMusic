<template>
  <div v-show="show" ref="library">
    <div v-if="loadFailed" class="load-failed">
      <span>音乐库加载失败，请点击重试</span>
      <button type="button" @click="retryLoadData">重新加载</button>
    </div>
    <h1>
      <img
        class="avatar"
        :src="data.user.avatarUrl | resizeImage"
        loading="lazy"
      />{{ data.user.nickname }}{{ $t('library.sLibrary') }}
    </h1>
    <div class="section-one">
      <div class="liked-songs" @click="goToLikedSongsList">
        <div
          v-if="liked.playlists.length > 0"
          class="liked-songs-background"
          :style="{
            backgroundImage: 'url(' + liked.playlists[0].coverImgUrl + ')',
          }"
        />
        <div class="bottom">
          <div class="titles">
            <div class="title">{{ $t('library.likedSongs') }}</div>
            <div class="sub-title">
              {{ liked.songs.length }} {{ $t('common.songs') }}
            </div>
          </div>
          <button @click.stop="openPlayModeTabMenu">
            <svg-icon icon-class="play" />
          </button>
        </div>
      </div>
      <div class="songs">
        <TrackList
          :id="liked.playlists.length > 0 ? liked.playlists[0].id : 0"
          :tracks="liked.songsWithDetails"
          :column-number="3"
          type="tracklist"
          dbclick-track-func="playPlaylistByID"
        />
      </div>
    </div>

    <div class="section-two">
      <div class="tabs-row">
        <div class="tabs">
          <div
            class="tab dropdown"
            :class="{ active: currentTab === 'playlists' }"
            @click="updateCurrentTab('playlists')"
          >
            <span class="text">{{
              {
                all: $t('contextMenu.allPlaylists'),
                mine: $t('contextMenu.minePlaylists'),
                liked: $t('contextMenu.likedPlaylists'),
              }[playlistFilter]
            }}</span>
            <span class="icon" @click.stop="openPlaylistTabMenu"
              ><svg-icon icon-class="dropdown"
            /></span>
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'albums' }"
            @click="updateCurrentTab('albums')"
          >
            {{ $t('library.albums') }}
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'artists' }"
            @click="updateCurrentTab('artists')"
          >
            {{ $t('library.artists') }}
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'mvs' }"
            @click="updateCurrentTab('mvs')"
          >
            {{ $t('library.mvs') }}
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'cloudDisk' }"
            @click="updateCurrentTab('cloudDisk')"
          >
            {{ $t('library.cloudDisk') }}
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'playHistory' }"
            @click="updateCurrentTab('playHistory')"
          >
            {{ $t('library.playHistory.title') }}
          </div>
        </div>
        <button
          v-show="currentTab === 'playlists'"
          class="tab-button"
          @click="openAddPlaylistModal"
          ><svg-icon icon-class="plus" />{{ $t('library.newPlayList') }}
        </button>
        <button
          v-show="currentTab === 'cloudDisk'"
          class="tab-button"
          @click="selectUploadFiles"
          ><svg-icon icon-class="arrow-up-alt" />{{ $t('library.uploadSongs') }}
        </button>
      </div>

      <div v-show="currentTab === 'playlists'">
        <div v-if="liked.playlists.length > 1">
          <CoverRow
            :items="filterPlaylists"
            type="playlist"
            sub-text="creator"
            :show-play-button="true"
          />
        </div>
      </div>

      <div v-show="currentTab === 'albums'">
        <CoverRow
          :items="liked.albums"
          type="album"
          sub-text="artist"
          :show-play-button="true"
        />
      </div>

      <div v-show="currentTab === 'artists'">
        <CoverRow
          :items="liked.artists"
          type="artist"
          :show-play-button="true"
        />
      </div>

      <div v-show="currentTab === 'mvs'">
        <MvRow :mvs="liked.mvs" />
      </div>

      <div v-show="currentTab === 'cloudDisk'">
        <TrackList
          :id="-8"
          :tracks="liked.cloudDisk"
          :column-number="3"
          type="cloudDisk"
          dbclick-track-func="playCloudDisk"
          :extra-context-menu-item="['removeTrackFromCloudDisk']"
        />
      </div>

      <div v-show="currentTab === 'playHistory'">
        <button
          :class="{
            'playHistory-button': true,
            'playHistory-button--selected': playHistoryMode === 'week',
          }"
          @click="playHistoryMode = 'week'"
        >
          {{ $t('library.playHistory.week') }}
        </button>
        <button
          :class="{
            'playHistory-button': true,
            'playHistory-button--selected': playHistoryMode === 'all',
          }"
          @click="playHistoryMode = 'all'"
        >
          {{ $t('library.playHistory.all') }}
        </button>
        <TrackList
          :tracks="playHistoryList"
          :column-number="1"
          type="tracklist"
        />
      </div>
    </div>

    <input
      ref="cloudDiskUploadInput"
      type="file"
      style="display: none"
      @change="uploadSongToCloudDisk"
    />

    <ContextMenu ref="playlistTabMenu">
      <div class="item" @click="changePlaylistFilter('all')">{{
        $t('contextMenu.allPlaylists')
      }}</div>
      <hr />
      <div class="item" @click="changePlaylistFilter('mine')">{{
        $t('contextMenu.minePlaylists')
      }}</div>
      <div class="item" @click="changePlaylistFilter('liked')">{{
        $t('contextMenu.likedPlaylists')
      }}</div>
    </ContextMenu>

    <ContextMenu ref="playModeTabMenu">
      <div class="item" @click="playLikedSongs">{{
        $t('library.likedSongs')
      }}</div>
      <hr />
      <div class="item" @click="playIntelligenceList">{{
        $t('contextMenu.cardiacMode')
      }}</div>
    </ContextMenu>
  </div>
</template>

<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import { dailyTask } from '@/utils/common';
import { isAccountLoggedIn } from '@/utils/auth';
import { uploadSong } from '@/api/user';

import NProgress from 'nprogress';
import locale from '@/locale';

import ContextMenu from '@/components/ContextMenu.vue';
import TrackList from '@/components/TrackList.vue';
import CoverRow from '@/components/CoverRow.vue';
import SvgIcon from '@/components/SvgIcon.vue';
import MvRow from '@/components/MvRow.vue';

export default {
  name: 'Library',
  components: { SvgIcon, CoverRow, TrackList, MvRow, ContextMenu },
  data() {
    return {
      show: false,
      likedSongs: [],
      loadFailed: false,

      currentTab: 'playlists',
      playHistoryMode: 'week',
    };
  },
  computed: {
    ...mapState(['data', 'liked']),

    playlistFilter() {
      return this.data.libraryPlaylistFilter || 'all';
    },
    filterPlaylists() {
      const playlists = this.liked.playlists.slice(1);
      const userId = this.data.user.userId;
      if (this.playlistFilter === 'mine') {
        return playlists.filter(p => p.creator.userId === userId);
      } else if (this.playlistFilter === 'liked') {
        return playlists.filter(p => p.creator.userId !== userId);
      }
      return playlists;
    },
    playHistoryList() {
      if (this.show && this.playHistoryMode === 'week') {
        return this.liked.playHistory.weekData;
      }
      if (this.show && this.playHistoryMode === 'all') {
        return this.liked.playHistory.allData;
      }
      return [];
    },
  },
  created() {
    setTimeout(() => {
      if (!this.show) NProgress.start();
    }, 1000);
    this.loadData();
  },
  activated() {
    this.$parent.$refs.scrollbar.restorePosition();
    this.loadData();
    dailyTask();
  },
  methods: {
    ...mapActions(['showToast']),
    ...mapMutations(['updateModal', 'updateData']),
    loadData() {
      this.loadFailed = false;
      if (this.liked.songsWithDetails.length > 0) {
        NProgress.done();
        this.show = true;
        this.$store.dispatch('fetchLikedSongsWithDetails');
      } else {
        this.$store
          .dispatch('fetchLikedSongsWithDetails')
          .then(this.onLikedSongsLoaded)
          .catch(this.onLikedSongsFailed);
      }
      this.$store.dispatch('fetchLikedSongs');
      this.$store.dispatch('fetchLikedPlaylist');
      this.$store.dispatch('fetchLikedAlbums');
      this.$store.dispatch('fetchLikedArtists');
      this.$store.dispatch('fetchLikedMVs');
      this.$store.dispatch('fetchCloudDisk');
      this.$store.dispatch('fetchPlayHistory');
    },
    onLikedSongsLoaded() {
      NProgress.done();
      this.show = true;
    },
    // 首次加载失败时 1 秒后重试一次，仍失败则显示页面并提示重试
    onLikedSongsFailed() {
      setTimeout(() => {
        this.$store
          .dispatch('fetchLikedSongsWithDetails')
          .then(this.onLikedSongsLoaded)
          .catch(this.onLikedSongsLoadFailed);
      }, 1000);
    },
    onLikedSongsLoadFailed() {
      NProgress.done();
      this.show = true;
      this.loadFailed = true;
      this.showToast('音乐库加载失败，请点击重试');
    },
    retryLoadData() {
      NProgress.start();
      this.loadData();
    },
    playLikedSongs() {
      this.$store.state.player.playPlaylistByID(
        this.liked.playlists[0].id,
        'first',
        true
      );
    },
    playIntelligenceList() {
      this.$store.state.player.playIntelligenceListById(
        this.liked.playlists[0].id,
        'first',
        true
      );
    },
    updateCurrentTab(tab) {
      if (!isAccountLoggedIn() && tab !== 'playlists') {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      this.currentTab = tab;
      this.$parent.$refs.main.scrollTo({ top: 375, behavior: 'smooth' });
    },
    goToLikedSongsList() {
      this.$router.push({ path: '/library/liked-songs' });
    },

    openAddPlaylistModal() {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      this.updateModal({
        modalName: 'newPlaylistModal',
        key: 'show',
        value: true,
      });
    },
    openPlaylistTabMenu(e) {
      this.$refs.playlistTabMenu.openMenu(e);
    },
    openPlayModeTabMenu(e) {
      this.$refs.playModeTabMenu.openMenu(e);
    },
    changePlaylistFilter(type) {
      this.updateData({ key: 'libraryPlaylistFilter', value: type });
      window.scrollTo({ top: 375, behavior: 'smooth' });
    },
    selectUploadFiles() {
      this.$refs.cloudDiskUploadInput.click();
    },
    uploadSongToCloudDisk(e) {
      const files = e.target.files;
      uploadSong(files[0]).then(result => {
        if (result.code === 200) {
          let newCloudDisk = this.liked.cloudDisk;
          newCloudDisk.unshift(result.privateCloud);
          this.$store.commit('updateLikedXXX', {
            name: 'cloudDisk',
            data: newCloudDisk,
          });
        }
      });
    },
  },
};
</script>

<style lang="scss" scoped>
h1 {
  font-size: 42px;
  color: var(--color-text);
  display: flex;
  align-items: center;
  .avatar {
    height: 44px;
    margin-right: 12px;
    vertical-align: -7px;
    border-radius: 50%;
    border: rgba(0, 0, 0, 0.2);
  }
}

.section-one {
  display: flex;
  margin-top: 24px;
  .songs {
    flex: 7;
    margin-top: 8px;
    margin-left: 36px;
    overflow: hidden;
  }
}

.liked-songs {
  flex: 3;
  margin-top: 8px;
  cursor: pointer;
  border-radius: 16px;
  padding: 18px 24px;
  display: flex;
  flex-direction: column;
  transition: all 0.4s;
  box-sizing: border-box;

  position: relative;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  @supports (
    (-webkit-backdrop-filter: blur(14px)) or (backdrop-filter: blur(14px))
  ) {
    -webkit-backdrop-filter: blur(14px) saturate(180%);
    backdrop-filter: blur(14px) saturate(180%);
  }
  &::before {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1;
    content: '';
    background-color: rgba(0, 0, 0, 0.35);
    background-image: linear-gradient(
      rgba(255, 255, 255, 0.25),
      rgba(255, 255, 255, 0)
    );
    pointer-events: none;
  }
  .liked-songs-background {
    position: absolute;
    top: -16px;
    right: -16px;
    bottom: -16px;
    left: -16px;
    z-index: 0;
    background-position: center;
    background-size: cover;
    filter: blur(16px) saturate(1.2);
    transform: scale(1.15);
    pointer-events: none;
  }

  .bottom {
    position: relative;
    z-index: 2;
    display: flex;
    width: 100%;
    justify-content: space-between;
    align-items: center;
    color: var(--color-primary);

    .titles {
      flex: 1;
      min-width: 0;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
    }
    .sub-title {
      font-size: 15px;
      margin-top: 2px;
    }

    button {
      margin-bottom: 2px;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 44px;
      width: 44px;
      flex-shrink: 0;
      margin-left: auto;
      background: var(--color-primary-gradient);
      border-radius: 50%;
      transition: 0.2s;
      box-shadow: 0 6px 12px -4px rgba(0, 0, 0, 0.2);
      cursor: default;

      .svg-icon {
        color: var(--color-primary-bg);
        margin-left: 4px;
        height: 16px;
        width: 16px;
      }
      &:hover {
        transform: scale(1.06);
        box-shadow: 0 6px 12px -4px rgba(0, 0, 0, 0.4);
      }
      &:active {
        transform: scale(0.94);
      }
    }
  }
}

.section-two {
  margin-top: 54px;
  min-height: calc(100vh - 182px);
}

.tabs-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  font-size: 18px;
  color: var(--color-text);
  .tab {
    font-weight: 600;
    padding: 8px 14px;
    margin-right: 14px;
    border-radius: 8px;
    cursor: pointer;
    user-select: none;
    transition: 0.2s;
    opacity: 0.68;
    &:hover {
      opacity: 0.88;
      background-color: var(--color-secondary-bg);
    }
  }
  .tab.active {
    opacity: 0.88;
    background-color: var(--color-secondary-bg);
  }
  .tab.dropdown {
    display: flex;
    align-items: center;
    padding: 0;
    overflow: hidden;
    .text {
      padding: 8px 3px 8px 14px;
    }
    .icon {
      height: 100%;
      display: flex;
      align-items: center;
      padding: 0 8px 0 3px;
      .svg-icon {
        height: 16px;
        width: 16px;
      }
    }
  }
}

button.tab-button {
  color: var(--color-text);
  border-radius: 8px;
  padding: 0 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: 0.2s;
  opacity: 0.68;
  font-weight: 500;
  .svg-icon {
    width: 14px;
    height: 14px;
    margin-right: 8px;
  }
  &:hover {
    opacity: 1;
    background: var(--color-secondary-bg);
  }
  &:active {
    opacity: 1;
    transform: scale(0.92);
  }
}

button.playHistory-button {
  color: var(--color-text);
  border-radius: 8px;
  padding: 6px 8px;
  margin-bottom: 12px;
  margin-right: 4px;
  transition: 0.2s;
  opacity: 0.68;
  font-weight: 500;
  cursor: pointer;
  &:hover {
    opacity: 1;
    background: var(--color-secondary-bg);
  }
  &:active {
    transform: scale(0.95);
  }
}

button.playHistory-button--selected {
  color: var(--color-text);
  background: var(--color-secondary-bg);
  opacity: 1;
  font-weight: 700;
  &:active {
    transform: none;
  }
}

.load-failed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--color-secondary-bg);
  color: var(--color-text);
}
.load-failed span {
  font-size: 14px;
  font-weight: 600;
}
.load-failed button {
  flex-shrink: 0;
  padding: 8px 16px;
  border: 1px solid var(--color-text);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
</style>
