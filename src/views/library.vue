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
      />
      {{ data.user.nickname }}{{ $t('library.sLibrary') }}
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
              {{ liked.songs.length }}{{ $t('common.songs') }}
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
            {{ $t('library.playHistory') }}
          </div>
        </div>
        <button
          v-show="currentTab === 'playHistory'"
          class="playHistory-button"
          :class="{
            'playHistory-button--selected': playHistoryMode === 'week',
          }"
          @click="changePlayHistoryMode('week')"
        >
          {{ $t('library.recentWeek') }}
        </button>
        <button
          v-show="currentTab === 'playHistory'"
          class="playHistory-button"
          :class="{
            'playHistory-button--selected': playHistoryMode === 'all',
          }"
          @click="changePlayHistoryMode('all')"
        >
          {{ $t('library.allTime') }}
        </button>
        <button
          v-show="currentTab === 'playlists'"
          class="playHistory-button"
          @click="uploadSong"
        >
          {{ $t('library.uploadSong') }}
        </button>
      </div>

      <div v-show="currentTab === 'playlists'">
        <CoverRow
          :items="filteredPlaylists"
          type="playlist"
          :show-play-button="true"
        />
        <ContextMenu ref="playlistTabMenu">
          <div
            class="item"
            @click="changePlaylistFilter('all')"
          >{{ $t('contextMenu.allPlaylists') }}</div>
          <div
            class="item"
            @click="changePlaylistFilter('mine')"
          >{{ $t('contextMenu.minePlaylists') }}</div>
          <div
            class="item"
            @click="changePlaylistFilter('liked')"
          >{{ $t('contextMenu.likedPlaylists') }}</div>
        </ContextMenu>
      </div>
      <div v-show="currentTab === 'albums'">
        <CoverRow :items="liked.albums" type="album" sub-text="artist" />
      </div>
      <div v-show="currentTab === 'artists'">
        <CoverRow
          :items="liked.artists"
          type="artist"
          :show-play-button="true"
        />
      </div>
      <div v-show="currentTab === 'mvs'">
        <CoverRow :items="liked.mvs" type="mv" sub-text="artist" />
      </div>
      <div v-show="currentTab === 'cloudDisk'">
        <TrackList
          :tracks="cloudDisk"
          :column-number="3"
          type="tracklist"
          dbclick-track-func="playCloudDiskByID"
        />
      </div>
      <div v-show="currentTab === 'playHistory'">
        <TrackList
          :tracks="playHistory"
          :column-number="3"
          type="tracklist"
          dbclick-track-func="playHistoryByID"
        />
      </div>
    </div>
    <ContextMenu ref="playModeTabMenu">
      <div class="item" @click="playAllLikedSongs">{{
        $t('library.playAllLikedSongs')
      }}</div>
      <div class="item" @click="shuffleAllLikedSongs">{{
        $t('library.shuffleAllLikedSongs')
      }}</div>
    </ContextMenu>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { dailyTask } from '@/utils/auth';
import { isAccountLoggedIn } from '@/utils/auth';
import { uploadSong } from '@/api/user';

import NProgress from 'nprogress';
import locale from '@/locale';

import TrackList from '@/components/TrackList.vue';
import CoverRow from '@/components/CoverRow.vue';
import ContextMenu from '@/components/ContextMenu.vue';

export default {
  name: 'Library',
  components: {
    TrackList,
    CoverRow,
    ContextMenu,
  },
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
    ...mapState(['data', 'liked', 'settings', 'player']),
    playlistFilter() {
      return this.data.playlistFilter;
    },
    filteredPlaylists() {
      if (this.playlistFilter === 'all') {
        return this.liked.playlists;
      } else if (this.playlistFilter === 'mine') {
        return this.liked.playlists.filter(
          playlist => playlist.creator.userId === this.data.user.userId
        );
      } else if (this.playlistFilter === 'liked') {
        return this.liked.playlists.filter(
          playlist => playlist.creator.userId !== this.data.user.userId
        );
      }
    },
    cloudDisk() {
      return this.liked.cloudDisk;
    },
    playHistory() {
      return this.playHistoryMode === 'week'
        ? this.liked.playHistory.weekData
        : this.liked.playHistory.allData;
    },
  },
  created() {
    setTimeout(() => {
      if (!this.show) {
        NProgress.start();
      }
    }, 1000);
    this.loadData();
  },
  activated() {
    this.$parent.$refs.scrollbar.restorePosition();
    this.loadData();
    this.dailyTask();
  },
  methods: {
    ...mapActions(['showToast']),
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
      this.$store.dispatch('fetchLikedAlbums');
      this.$store.dispatch('fetchLikedArtists');
      this.$store.dispatch('fetchLikedMVs');
      this.$store.dispatch('fetchLikedCloudDisk');
      this.$store.dispatch('fetchPlayHistory');
      this.$store.dispatch('fetchLikedPlaylists');
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
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      this.$store.dispatch('playAllLikedSongs');
    },
    updateCurrentTab(tab) {
      this.currentTab = tab;
    },
    changePlayHistoryMode(mode) {
      this.playHistoryMode = mode;
    },
    changePlaylistFilter(type) {
      this.$store.dispatch('updatePlaylistFilter', type);
    },
    goToLikedSongsList() {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      if (this.liked.playlists.length > 0) {
        this.$router.push({
          path: `/playlist/${this.liked.playlists[0].id}`,
        });
      }
    },
    openPlaylistTabMenu(e) {
      this.$refs.playlistTabMenu.openMenu(e);
    },
    openPlayModeTabMenu(e) {
      this.$refs.playModeTabMenu.openMenu(e);
    },
    playAllLikedSongs() {
      this.$store.dispatch('playAllLikedSongs');
    },
    shuffleAllLikedSongs() {
      this.$store.dispatch('shuffleAllLikedSongs');
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
}
h1 .avatar {
  height: 44px;
  width: 44px;
  margin-right: 12px;
  vertical-align: -7px;
  border-radius: 50%;
  border: rgba(0, 0, 0, 0.2);
}
.section-one {
  display: flex;
  margin-top: 24px;
  .liked-songs {
    flex: 1;
    min-width: 0;
    height: 204px;
    border-radius: 16px;
    color: white;
    padding: 18px 24px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    position: relative;
    overflow: hidden;
    background: linear-gradient(
      162.94deg,
      #ee3a5a 0%,
      rgba(255, 190, 11, 0.8) 100%
    );
    background-size: 300% 300%;
    animation: gradient 10s ease infinite;
    transition: all 0.3s;
    cursor: pointer;
    user-select: none;

    .liked-songs-background {
      height: 100%;
      width: 100%;
      position: absolute;
      left: 0;
      top: 0;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      filter: brightness(0.5) blur(40px) saturate(1.5);
    }
    .bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1;
      .titles {
        .title {
          font-size: 22px;
          font-weight: 700;
          line-height: 24px;
          color: #ffffff;
        }
        .sub-title {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          margin-top: 2px;
        }
      }
      button {
        background: rgba(255, 255, 255, 0.14);
        border: 1px solid rgba(255, 255, 255, 0.08);
        height: 44px;
        width: 44px;
        border-radius: 50%;
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        transition: 0.2s;
        svg {
          height: 22px;
          width: 22px;
          margin-left: 3px;
          color: #fff;
        }
      }
      button:hover {
        transform: scale(1.1);
      }
    }
  }
  .liked-songs:hover {
    transform: scale(1.02);
  }

  .songs {
    flex: 2;
    min-width: 0;
    margin-left: 24px;
    .tracklist {
      margin-left: 16px;
    }
  }
}

.section-two {
  margin-top: 54px;
  min-height: 300px;
  .tabs-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    .tabs {
      display: flex;
      flex-wrap: wrap;
      font-size: 18px;
      .tab {
        font-weight: 700;
        margin-right: 24px;
        color: var(--color-text);
        opacity: 0.68;
        cursor: pointer;
        user-select: none;
      }
      .tab:hover {
        opacity: 0.88;
      }
      .tab.active {
        opacity: 1;
      }
      .tab.dropdown {
        display: flex;
        align-items: center;
        .text {
          margin-right: 4px;
        }
        .icon {
          display: flex;
          align-items: center;
        }
      }
    }
  }
}
@supports (-webkit-backdrop-filter: none) or (backdrop-filter: none) {
  .liked-songs {
    .bottom {
      button {
        backdrop-filter: blur(8px);
      }
    }
  }
}
@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

button.playHistory-button {
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--color-text);
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  padding: 8px 12px;
}
button.playHistory-button--selected {
  background: var(--color-secondary-bg);
  color: var(--color-text);
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
