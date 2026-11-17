<template>
  <transition name="slide-up">
    <div
      class="lyrics-page"
      :class="{ 'no-lyric': noLyric, 'ipod-theme': playerTheme !== 'default' }"
      :data-theme="theme"
    >
      <div v-if="playerTheme === 'ipod-classic'" class="ipod-classic">
        <div class="ipod-device">
          <div class="ipod-screen">
            <div class="ipod-screen-header">
              <img :src="imageUrl" class="ipod-cover" alt="" />
              <div class="ipod-meta">
                <div class="ipod-title">{{ track.name }}</div>
                <div class="ipod-artist">{{
                  track.ar && track.ar[0] ? track.ar[0].name : ''
                }}</div>
                <div class="ipod-album">{{
                  track.al ? track.al.name : ''
                }}</div>
              </div>
            </div>
            <div class="ipod-progress" @click="seekIpod">
              <div
                class="ipod-progress-fill"
                :style="{ width: ipodProgress * 100 + '%' }"
              />
            </div>
            <div class="ipod-times">
              <span>{{ formatSeconds(player.progress) || '0:00' }}</span>
              <span>-{{ formatSeconds(ipodRemaining) || '0:00' }}</span>
            </div>
            <div ref="ipodClassicLyrics" class="ipod-lyrics">
              <div
                v-for="(line, index) in lyricToShow"
                :key="index"
                :class="[
                  'ipod-lyric-line',
                  { active: highlightLyricIndex === index },
                ]"
                @click="seekIpodLyric(line)"
              >
                <div>{{ line.content }}</div>
                <div v-if="line.translation" class="ipod-lyric-translation">{{
                  line.translation
                }}</div>
              </div>
              <div
                v-if="!lyricToShow || !lyricToShow.length"
                class="ipod-lyric-line"
                >暂无歌词</div
              >
            </div>
          </div>
          <div
            class="ipod-wheel"
            @pointerdown="wheelPointerDown"
            @pointermove="wheelPointerMove"
            @pointerup="wheelPointerUp"
            @pointercancel="wheelPointerUp"
          >
            <span class="ipod-wheel-label ipod-wheel-menu">MENU</span>
            <span class="ipod-wheel-label ipod-wheel-prev"
              >|&#9664;&#9664;</span
            >
            <span class="ipod-wheel-label ipod-wheel-next"
              >&#9654;&#9654;|</span
            >
            <span class="ipod-wheel-label ipod-wheel-play"
              >&#9654;&#10074;&#10074;</span
            >
            <button
              type="button"
              class="ipod-wheel-center"
              aria-label="播放或暂停"
              @click.stop="wheelCenterClick"
            />
          </div>
        </div>
      </div>
      <div v-if="playerTheme === 'ipod-touch'" class="ipod-touch">
        <button type="button" class="ipod-touch-close" @click="toggleLyrics"
          >&#8249; 关闭</button
        >
        <img :src="imageUrl" class="ipod-touch-cover" alt="" />
        <div class="ipod-touch-title">{{ track.name }}</div>
        <div class="ipod-touch-artist"
          >{{ track.ar && track.ar[0] ? track.ar[0].name : '' }} -
          {{ track.al ? track.al.name : '' }}</div
        >
        <div class="ipod-touch-progress" @click="seekIpod">
          <div
            class="ipod-touch-progress-fill"
            :style="{ width: ipodProgress * 100 + '%' }"
          />
        </div>
        <div class="ipod-touch-times">
          <span>{{ formatSeconds(player.progress) || '0:00' }}</span>
          <span>-{{ formatSeconds(ipodRemaining) || '0:00' }}</span>
        </div>
        <div class="ipod-touch-controls">
          <button
            type="button"
            class="ipod-touch-small"
            :class="{ active: player.shuffle }"
            aria-label="随机播放"
            @click="player.switchShuffle()"
            >&#8646;</button
          >
          <button
            type="button"
            class="ipod-touch-prev"
            aria-label="上一曲"
            @click="playPrevTrack"
            >|&#9664;&#9664;</button
          >
          <button
            type="button"
            class="ipod-touch-play"
            aria-label="播放或暂停"
            @click="playOrPause"
            >{{ player.playing ? '&#10074;&#10074;' : '&#9654;' }}</button
          >
          <button
            type="button"
            class="ipod-touch-next"
            aria-label="下一曲"
            @click="playNextTrack"
            >&#9654;&#9654;|</button
          >
          <button
            type="button"
            class="ipod-touch-small"
            :class="{ active: player.repeatMode !== 'off' }"
            aria-label="循环播放"
            @click="player.switchRepeatMode()"
            >&#8635;<span v-if="player.repeatMode === 'one'">1</span></button
          >
        </div>
        <div class="ipod-touch-volume">
          <span class="ipod-touch-volume-label">音量</span>
          <input
            v-model="volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            class="ipod-touch-volume-slider"
            aria-label="音量"
          />
        </div>
        <button
          type="button"
          class="ipod-touch-like"
          :class="{ active: player.isCurrentTrackLiked }"
          @click="likeATrack(track.id)"
          >{{
            player.isCurrentTrackLiked ? '&#10084;' : '&#9825;'
          }}
          喜欢</button
        >
        <div ref="ipodTouchLyrics" class="ipod-touch-lyrics">
          <div
            v-for="(line, index) in lyricToShow"
            :key="index"
            :class="[
              'ipod-lyric-line',
              { active: highlightLyricIndex === index },
            ]"
            @click="seekIpodLyric(line)"
          >
            <div>{{ line.content }}</div>
            <div v-if="line.translation" class="ipod-lyric-translation">{{
              line.translation
            }}</div>
          </div>
          <div
            v-if="!lyricToShow || !lyricToShow.length"
            class="ipod-lyric-line"
            >暂无歌词</div
          >
        </div>
      </div>
      <div
        v-if="
          (settings.lyricsBackground === 'blur') |
            (settings.lyricsBackground === 'dynamic')
        "
        class="lyrics-background"
        :class="{
          'dynamic-background': settings.lyricsBackground === 'dynamic',
        }"
      >
        <div
          class="top-right"
          :style="{ backgroundImage: `url(${bgImageUrl})` }"
        />
        <div
          class="bottom-left"
          :style="{ backgroundImage: `url(${bgImageUrl})` }"
        />
      </div>
      <div
        v-if="settings.lyricsBackground === true"
        class="gradient-background"
        :style="{ background }"
      ></div>

      <div class="left-side">
        <div>
          <div v-if="settings.showLyricsTime" class="date">
            {{ date }}
          </div>
          <div class="cover">
            <div class="cover-container">
              <img :src="imageUrl" loading="lazy" />
              <div
                class="shadow"
                :style="{ backgroundImage: `url(${imageUrl})` }"
              ></div>
            </div>
          </div>
          <div class="controls">
            <div class="top-part">
              <div class="track-info">
                <div class="title" :title="currentTrack.name">
                  <router-link
                    v-if="hasList()"
                    :to="`${getListPath()}`"
                    @click.native="toggleLyrics"
                    >{{ currentTrack.name }}
                  </router-link>
                  <span v-else>
                    {{ currentTrack.name }}
                  </span>
                </div>
                <div class="subtitle">
                  <router-link
                    v-if="artist.id !== 0"
                    :to="`/artist/${artist.id}`"
                    @click.native="toggleLyrics"
                    >{{ artist.name }}
                  </router-link>
                  <span v-else>
                    {{ artist.name }}
                  </span>
                  <span v-if="album.id !== 0">
                    -
                    <router-link
                      :to="`/album/${album.id}`"
                      :title="album.name"
                      @click.native="toggleLyrics"
                      >{{ album.name }}
                    </router-link>
                  </span>
                </div>
              </div>
              <div class="top-right">
                <div class="volume-control">
                  <button-icon :title="$t('player.mute')" @click.native="mute">
                    <svg-icon v-show="volume > 0.5" icon-class="volume" />
                    <svg-icon v-show="volume === 0" icon-class="volume-mute" />
                    <svg-icon
                      v-show="volume <= 0.5 && volume !== 0"
                      icon-class="volume-half"
                    />
                  </button-icon>
                  <div class="volume-bar">
                    <vue-slider
                      v-model="volume"
                      :min="0"
                      :max="1"
                      :interval="0.01"
                      :drag-on-click="true"
                      :duration="0"
                      tooltip="none"
                      :dot-size="12"
                    ></vue-slider>
                  </div>
                </div>
                <div class="buttons">
                  <button-icon
                    :title="$t('player.like')"
                    @click.native="likeATrack(player.currentTrack.id)"
                  >
                    <svg-icon
                      :icon-class="
                        player.isCurrentTrackLiked ? 'heart-solid' : 'heart'
                      "
                    />
                  </button-icon>
                  <button-icon
                    :title="$t('contextMenu.addToPlaylist')"
                    @click.native="addToPlaylist"
                  >
                    <svg-icon icon-class="plus" />
                  </button-icon>
                  <!-- <button-icon @click.native="openMenu" title="Menu"
                    ><svg-icon icon-class="more"
                  /></button-icon> -->
                </div>
              </div>
            </div>
            <div class="progress-bar">
              <span>{{ formatTrackTime(player.progress) || '0:00' }}</span>
              <div class="slider">
                <vue-slider
                  v-model="player.progress"
                  :min="0"
                  :max="player.currentTrackDuration"
                  :interval="1"
                  :drag-on-click="true"
                  :duration="0"
                  :dot-size="12"
                  :height="2"
                  :tooltip-formatter="formatTrackTime"
                  :lazy="true"
                  :silent="true"
                ></vue-slider>
              </div>
              <span>{{ formatTrackTime(player.currentTrackDuration) }}</span>
            </div>
            <div class="media-controls">
              <button-icon
                v-show="!player.isPersonalFM"
                :title="
                  player.repeatMode === 'one'
                    ? $t('player.repeatTrack')
                    : $t('player.repeat')
                "
                :class="{ active: player.repeatMode !== 'off' }"
                @click.native="switchRepeatMode"
              >
                <svg-icon
                  v-show="player.repeatMode !== 'one'"
                  icon-class="repeat"
                />
                <svg-icon
                  v-show="player.repeatMode === 'one'"
                  icon-class="repeat-1"
                />
              </button-icon>
              <div class="middle">
                <button-icon
                  v-show="!player.isPersonalFM"
                  :title="$t('player.previous')"
                  @click.native="playPrevTrack"
                >
                  <svg-icon icon-class="previous" />
                </button-icon>
                <button-icon
                  v-show="player.isPersonalFM"
                  title="不喜欢"
                  @click.native="moveToFMTrash"
                >
                  <svg-icon icon-class="thumbs-down" />
                </button-icon>
                <button-icon
                  id="play"
                  :title="$t(player.playing ? 'player.pause' : 'player.play')"
                  @click.native="playOrPause"
                >
                  <svg-icon :icon-class="player.playing ? 'pause' : 'play'" />
                </button-icon>
                <button-icon
                  :title="$t('player.next')"
                  @click.native="playNextTrack"
                >
                  <svg-icon icon-class="next" />
                </button-icon>
              </div>
              <button-icon
                v-show="!player.isPersonalFM"
                :title="$t('player.shuffle')"
                :class="{ active: player.shuffle }"
                @click.native="switchShuffle"
              >
                <svg-icon icon-class="shuffle" />
              </button-icon>
              <button-icon
                v-show="
                  isShowLyricTypeSwitch &&
                  $store.state.settings.showLyricsTranslation &&
                  lyricType === 'translation'
                "
                :title="$t('player.translationLyric')"
                @click.native="switchLyricType"
              >
                <span class="lyric-switch-icon">译</span>
              </button-icon>
              <button-icon
                v-show="
                  isShowLyricTypeSwitch &&
                  $store.state.settings.showLyricsTranslation &&
                  lyricType === 'romaPronunciation'
                "
                :title="$t('player.PronunciationLyric')"
                @click.native="switchLyricType"
              >
                <span class="lyric-switch-icon">音</span>
              </button-icon>
            </div>
          </div>
        </div>
      </div>
      <div class="right-side">
        <transition name="slide-fade">
          <div
            v-show="!noLyric"
            ref="lyricsContainer"
            class="lyrics-container"
            :style="lyricFontSize"
          >
            <div id="line-1" class="line"></div>
            <div
              v-for="(line, index) in lyricToShow"
              :id="`line${index}`"
              :key="index"
              class="line"
              :class="{
                highlight: highlightLyricIndex === index,
              }"
              @click="clickLyricLine(line.time)"
              @dblclick="clickLyricLine(line.time, true)"
            >
              <div class="content">
                <span
                  v-if="line.contents[0]"
                  @click.right="openLyricMenu($event, line, 0)"
                  >{{ line.contents[0] }}</span
                >
                <br />
                <span
                  v-if="
                    line.contents[1] &&
                    $store.state.settings.showLyricsTranslation
                  "
                  class="translation"
                  @click.right="openLyricMenu($event, line, 1)"
                  >{{ line.contents[1] }}</span
                >
              </div>
            </div>
            <div id="line-end" class="line"></div>
            <ContextMenu v-if="!noLyric" ref="lyricMenu">
              <div class="item" @click="copyLyric(false)">{{
                $t('contextMenu.copyLyric')
              }}</div>
              <div
                v-if="
                  rightClickLyric &&
                  rightClickLyric.contents[1] &&
                  $store.state.settings.showLyricsTranslation
                "
                class="item"
                @click="copyLyric(true)"
                >{{ $t('contextMenu.copyLyricWithTranslation') }}</div
              >
            </ContextMenu>
          </div>
        </transition>
      </div>
      <div class="close-button" @click="toggleLyrics">
        <button>
          <svg-icon icon-class="arrow-down" />
        </button>
      </div>
      <div class="close-button" style="left: 24px" @click="fullscreen">
        <button>
          <svg-icon v-if="isFullscreen" icon-class="fullscreen-exit" />
          <svg-icon v-else icon-class="fullscreen" />
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
// The lyrics page of Apple Music is so gorgeous, so I copy the design.
// Some of the codes are from https://github.com/sl1673495/vue-netease-music

import { mapState, mapMutations, mapActions } from 'vuex';
import VueSlider from 'vue-slider-component';
import ContextMenu from '@/components/ContextMenu.vue';
import { formatTrackTime } from '@/utils/common';
import { getLyric, getCloudLyric } from '@/api/track';
import { lyricParser, copyLyric, parseLyric } from '@/utils/lyrics';
import ButtonIcon from '@/components/ButtonIcon.vue';
import * as Vibrant from 'node-vibrant/dist/vibrant.worker.min.js';
import Color from 'color';
import { isAccountLoggedIn } from '@/utils/auth';
import { hasListSource, getListSourcePath } from '@/utils/playList';
import locale from '@/locale';

const electron =
  process.env.IS_ELECTRON === true ? window.require('electron') : null;
const ipcRenderer = electron?.ipcRenderer || null;

export default {
  name: 'Lyrics',
  components: {
    VueSlider,
    ButtonIcon,
    ContextMenu,
  },
  data() {
    return {
      lyricsInterval: null,
      lyric: [],
      tlyric: [],
      romalyric: [],
      lyricType: 'translation', // or 'romaPronunciation'
      highlightLyricIndex: -1,
      minimize: true,
      background: '',
      date: this.formatTime(new Date()),
      isFullscreen: !!document.fullscreenElement,
      rightClickLyric: null,
    };
  },
  computed: {
    playerTheme() {
      return this.$store.state.settings.playerTheme || 'default';
    },
    clickSoundEnabled() {
      return this.$store.state.settings.clickSound !== false;
    },
    ipodProgress() {
      const duration = ((this.track && this.track.dt) || 0) / 1000;
      if (!duration) {
        return 0;
      }
      return Math.min(1, Math.max(0, this.player.progress / duration));
    },
    ipodRemaining() {
      const duration = ((this.track && this.track.dt) || 0) / 1000;
      return Math.max(0, duration - this.player.progress);
    },
    ...mapState(['player', 'settings', 'showLyrics']),
    currentTrack() {
      return this.player.currentTrack;
    },
    track() {
      return this.currentTrack || {};
    },

    volume: {
      get() {
        return this.player.volume;
      },
      set(value) {
        this.player.volume = value;
      },
    },
    imageUrl() {
      return this.player.currentTrack?.al?.picUrl + '?param=1024y1024';
    },
    bgImageUrl() {
      return this.player.currentTrack?.al?.picUrl + '?param=512y512';
    },
    isShowLyricTypeSwitch() {
      return this.romalyric.length > 0 && this.tlyric.length > 0;
    },
    lyricToShow() {
      return this.lyricType === 'translation'
        ? this.lyricWithTranslation
        : this.lyricWithRomaPronunciation;
    },
    lyricWithTranslation() {
      let ret = [];
      // 空内容的去除
      const lyricFiltered = this.lyric.filter(({ content }) =>
        Boolean(content)
      );
      // content统一转换数组形式
      if (lyricFiltered.length) {
        lyricFiltered.forEach(l => {
          const { rawTime, time, content } = l;
          const lyricItem = { time, content, contents: [content] };
          const sameTimeTLyric = this.tlyric.find(
            ({ rawTime: tLyricRawTime }) => tLyricRawTime === rawTime
          );
          if (sameTimeTLyric) {
            const { content: tLyricContent } = sameTimeTLyric;
            if (content) {
              lyricItem.contents.push(tLyricContent);
            }
          }
          ret.push(lyricItem);
        });
      } else {
        ret = lyricFiltered.map(({ time, content }) => ({
          time,
          content,
          contents: [content],
        }));
      }
      return ret;
    },
    lyricWithRomaPronunciation() {
      let ret = [];
      // 空内容的去除
      const lyricFiltered = this.lyric.filter(({ content }) =>
        Boolean(content)
      );
      // content统一转换数组形式
      if (lyricFiltered.length) {
        lyricFiltered.forEach(l => {
          const { rawTime, time, content } = l;
          const lyricItem = { time, content, contents: [content] };
          const sameTimeRomaLyric = this.romalyric.find(
            ({ rawTime: tLyricRawTime }) => tLyricRawTime === rawTime
          );
          if (sameTimeRomaLyric) {
            const { content: romaLyricContent } = sameTimeRomaLyric;
            if (content) {
              lyricItem.contents.push(romaLyricContent);
            }
          }
          ret.push(lyricItem);
        });
      } else {
        ret = lyricFiltered.map(({ time, content }) => ({
          time,
          content,
          contents: [content],
        }));
      }
      return ret;
    },
    lyricFontSize() {
      return {
        fontSize: `${this.$store.state.settings.lyricFontSize || 28}px`,
      };
    },
    noLyric() {
      return this.lyric.length == 0;
    },
    artist() {
      return this.currentTrack?.ar
        ? this.currentTrack.ar[0]
        : { id: 0, name: 'unknown' };
    },
    album() {
      return this.currentTrack?.al || { id: 0, name: 'unknown' };
    },
    theme() {
      return this.settings.lyricsBackground === true ? 'dark' : 'auto';
    },
  },
  watch: {
    currentTrack() {
      this.getLyric();
      this.getCoverColor();
    },
    showLyrics(show) {
      if (show) {
        this.setLyricsInterval();
        this.$store.commit('enableScrolling', false);
      } else {
        // 在 Electron 环境下，即使不显示歌词页面，也保持定时器运行以更新 Touch Bar
        if (process.env.IS_ELECTRON !== true) {
          clearInterval(this.lyricsInterval);
        }
        this.$store.commit('enableScrolling', true);
        // Fullscreen is requested on documentElement, so it makes the whole
        // window fullscreen. Since the only way to leave fullscreen from the
        // UI lives on this page, closing it would leave the window stuck in
        // fullscreen with no way out (minimize/restore stays fullscreen).
        this.exitFullscreen();
      }
    },
    highlightLyricIndex() {
      this.scrollIpodLyrics();
    },
  },
  created() {
    this.getLyric();
    this.getCoverColor();
    this.initDate();
    // 在 Electron 环境下立即启动歌词定时器，以便 Touch Bar 可以显示歌词
    if (process.env.IS_ELECTRON === true) {
      this.setLyricsInterval();
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'F11') {
        e.preventDefault();
        this.fullscreen();
      }
    });
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
    });
  },
  beforeDestroy: function () {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.exitFullscreen();
  },
  destroyed() {
    clearInterval(this.lyricsInterval);
  },
  methods: {
    playClickSound() {
      if (!this.clickSoundEnabled) {
        return;
      }
      try {
        if (!this._clickAudioContext) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) {
            return;
          }
          this._clickAudioContext = new AudioContext();
        }
        const context = this._clickAudioContext;
        if (context.state === 'suspended') {
          context.resume();
        }
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'square';
        oscillator.frequency.value = 2000;
        gain.gain.setValueAtTime(0.05, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          context.currentTime + 0.02
        );
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.03);
      } catch (err) {
        if (err) {
          // Click sound is best-effort; ignore audio errors.
        }
      }
    },
    vibrateWheel() {
      try {
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      } catch (err) {
        if (err) {
          // Vibration is best-effort; ignore errors.
        }
      }
    },
    wheelClickFeedback() {
      this.playClickSound();
      this.vibrateWheel();
    },
    wheelAngleFromEvent(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - (rect.left + rect.width / 2);
      const y = event.clientY - (rect.top + rect.height / 2);
      return (Math.atan2(y, x) * 180) / Math.PI;
    },
    wheelPointerDown(event) {
      if (
        event.target &&
        event.target.closest &&
        event.target.closest('.ipod-wheel-center')
      ) {
        return;
      }
      this._wheelPointerId = event.pointerId;
      this._wheelLastAngle = this.wheelAngleFromEvent(event);
      this._wheelAccumulated = 0;
      this._wheelDownTime = Date.now();
      this._wheelDownX = event.clientX;
      this._wheelDownY = event.clientY;
      this._wheelMoved = false;
      if (event.currentTarget.setPointerCapture) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch (err) {
          if (err) {
            // Ignore pointer capture errors.
          }
        }
      }
    },
    wheelPointerMove(event) {
      if (this._wheelPointerId !== event.pointerId) {
        return;
      }
      const moved =
        Math.abs(event.clientX - this._wheelDownX) +
        Math.abs(event.clientY - this._wheelDownY);
      if (moved > 10) {
        this._wheelMoved = true;
      }
      const angle = this.wheelAngleFromEvent(event);
      let delta = angle - this._wheelLastAngle;
      delta = ((delta + 540) % 360) - 180;
      this._wheelLastAngle = angle;
      this._wheelAccumulated += delta;
      const step = 30;
      if (Math.abs(this._wheelAccumulated) >= step) {
        const lines = Math.trunc(this._wheelAccumulated / step);
        this._wheelAccumulated -= lines * step;
        this.scrollIpodWheel(lines);
        for (let i = 0; i < Math.abs(lines); i += 1) {
          this.wheelClickFeedback();
        }
      }
    },
    wheelPointerUp(event) {
      if (this._wheelPointerId !== event.pointerId) {
        return;
      }
      this._wheelPointerId = null;
      const duration = Date.now() - this._wheelDownTime;
      if (!this._wheelMoved && duration < 300) {
        const angle = this.wheelAngleFromEvent(event);
        if (angle >= -135 && angle < -45) {
          this.wheelClickFeedback();
          this.toggleLyrics();
        } else if (angle >= -45 && angle < 45) {
          this.wheelClickFeedback();
          this.playNextTrack();
        } else if (angle >= 45 && angle < 135) {
          this.wheelClickFeedback();
          this.playOrPause();
        } else {
          this.wheelClickFeedback();
          this.playPrevTrack();
        }
      }
    },
    wheelCenterClick() {
      this.wheelClickFeedback();
      this.playOrPause();
    },
    scrollIpodWheel(lines) {
      const container =
        this.$refs.ipodClassicLyrics || this.$refs.ipodTouchLyrics;
      if (!container) {
        return;
      }
      this._ipodManualUntil = Date.now() + 4000;
      container.scrollTop += lines * 26;
    },
    scrollIpodLyrics() {
      if (this._ipodManualUntil && Date.now() < this._ipodManualUntil) {
        return;
      }
      const refs = [this.$refs.ipodClassicLyrics, this.$refs.ipodTouchLyrics];
      refs.forEach(container => {
        if (!container) {
          return;
        }
        const active = container.querySelector('.ipod-lyric-line.active');
        if (active) {
          active.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });
    },
    seekIpod(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (event.clientX - rect.left) / rect.width)
      );
      const duration = ((this.track && this.track.dt) || 0) / 1000;
      if (!duration) {
        return;
      }
      this.player.seek(ratio * duration);
    },
    seekIpodLyric(line) {
      if (line && typeof line.time === 'number') {
        this.player.seek(line.time);
      }
    },
    ...mapMutations(['toggleLyrics', 'updateModal']),
    ...mapActions(['likeATrack']),
    initDate() {
      var _this = this;
      clearInterval(this.timer);
      this.timer = setInterval(function () {
        _this.date = _this.formatTime(new Date());
      }, 1000);
    },
    formatSeconds(value) {
      const total = Math.max(0, Math.floor(Number(value) || 0));
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      return minutes + ':' + String(seconds).padStart(2, '0');
    },
    formatTime(value) {
      let hour = value.getHours().toString();
      let minute = value.getMinutes().toString();
      let second = value.getSeconds().toString();
      return (
        hour.padStart(2, '0') +
        ':' +
        minute.padStart(2, '0') +
        ':' +
        second.padStart(2, '0')
      );
    },
    fullscreen() {
      if (document.fullscreenElement) {
        this.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    },
    exitFullscreen() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    },
    addToPlaylist() {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      this.$store.dispatch('fetchLikedPlaylist');
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'show',
        value: true,
      });
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'selectedTrackID',
        value: this.currentTrack?.id,
      });
    },
    playPrevTrack() {
      this.player.playPrevTrack();
    },
    playOrPause() {
      this.player.playOrPause();
    },
    playNextTrack() {
      if (this.player.isPersonalFM) {
        this.player.playNextFMTrack();
      } else {
        this.player.playNextTrack();
      }
    },
    getLyric() {
      if (!this.currentTrack.id) return;
      if (
        this.currentTrack.pc !== null &&
        this.currentTrack.cd === null &&
        this.$store.state.data.user?.userId
      ) {
        //云盘未设置关联的歌曲获取其内置歌词
        return getCloudLyric(
          this.currentTrack.id,
          this.$store.state.data.user?.userId
        ).then(data => {
          this.tlyric = [];
          this.romalyric = [];
          this.lyric = data?.lrc?.length > 0 ? parseLyric(data.lrc) : [];
          this.lyricType = 'translation';
          return true;
        });
      }
      return getLyric(this.currentTrack.id).then(data => {
        if (!data?.lrc?.lyric) {
          this.lyric = [];
          this.tlyric = [];
          this.romalyric = [];
          return false;
        } else {
          let { lyric, tlyric, romalyric } = lyricParser(data);
          lyric = lyric.filter(
            l => !/^作(词|曲)\s*(:|：)\s*无$/.exec(l.content)
          );
          let includeAM =
            lyric.length <= 10 &&
            lyric.map(l => l.content).includes('纯音乐，请欣赏');
          if (includeAM) {
            let reg = /^作(词|曲)\s*(:|：)\s*/;
            let author = this.currentTrack?.ar[0]?.name;
            lyric = lyric.filter(l => {
              let regExpArr = l.content.match(reg);
              return (
                !regExpArr || l.content.replace(regExpArr[0], '') !== author
              );
            });
          }
          if (lyric.length === 1 && includeAM) {
            this.lyric = [];
            this.tlyric = [];
            this.romalyric = [];
            return false;
          } else {
            this.lyric = lyric;
            this.tlyric = tlyric;
            this.romalyric = romalyric;
            if (tlyric.length * romalyric.length > 0) {
              this.lyricType = 'translation';
            } else {
              this.lyricType =
                lyric.length > 0 ? 'translation' : 'romaPronunciation';
            }
            return true;
          }
        }
      });
    },
    switchLyricType() {
      this.lyricType =
        this.lyricType === 'translation' ? 'romaPronunciation' : 'translation';
    },
    formatTrackTime(value) {
      return formatTrackTime(value);
    },
    clickLyricLine(value, startPlay = false) {
      // TODO: 双击选择还会选中文字，考虑搞个右键菜单复制歌词
      let jumpFlag = false;
      this.lyric.filter(function (item) {
        if (item.content == '纯音乐，请欣赏') {
          jumpFlag = true;
        }
      });
      if (window.getSelection().toString().length === 0 && !jumpFlag) {
        this.player.seek(value);
      }
      if (startPlay === true) {
        this.player.play();
      }
    },
    openLyricMenu(e, lyric, idx) {
      this.rightClickLyric = { ...lyric, idx };
      this.$refs.lyricMenu.openMenu(e);
      e.preventDefault();
    },
    copyLyric(withTranslation) {
      if (this.rightClickLyric) {
        const idx = this.rightClickLyric.idx;
        if (!withTranslation) {
          copyLyric(this.rightClickLyric.contents[idx]);
        } else {
          copyLyric(this.rightClickLyric.contents.join(' '));
        }
      }
    },
    setLyricsInterval() {
      this.lyricsInterval = setInterval(() => {
        const progress = this.player.seek(null, false) ?? 0;
        let oldHighlightLyricIndex = this.highlightLyricIndex;
        this.highlightLyricIndex = this.lyric.findIndex((l, index) => {
          const nextLyric = this.lyric[index + 1];
          return (
            progress >= l.time && (nextLyric ? progress < nextLyric.time : true)
          );
        });
        if (oldHighlightLyricIndex !== this.highlightLyricIndex) {
          // 只在显示歌词页面时才滚动
          if (this.showLyrics) {
            const el = document.getElementById(
              `line${this.highlightLyricIndex}`
            );
            if (el)
              el.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
          }

          // 发送当前歌词到主进程（用于 Touch Bar 显示）
          if (ipcRenderer && this.highlightLyricIndex >= 0) {
            const currentLyricLine = this.lyricToShow[this.highlightLyricIndex];
            if (currentLyricLine && currentLyricLine.contents) {
              // 只发送第一行歌词（原文），避免显示过长
              const lyricText = currentLyricLine.contents[0] || '';
              ipcRenderer.send('updateLyric', { lyric: lyricText });
            }
          }
        }
      }, 50);
    },
    moveToFMTrash() {
      this.player.moveToFMTrash();
    },
    switchRepeatMode() {
      this.player.switchRepeatMode();
    },
    switchShuffle() {
      this.player.switchShuffle();
    },
    getCoverColor() {
      if (this.settings.lyricsBackground !== true) return;
      const cover = this.currentTrack.al?.picUrl + '?param=256y256';
      Vibrant.from(cover, { colorCount: 1 })
        .getPalette()
        .then(palette => {
          const originColor = Color.rgb(palette.DarkMuted._rgb);
          const color = originColor.darken(0.1).rgb().string();
          const color2 = originColor.lighten(0.28).rotate(-30).rgb().string();
          this.background = `linear-gradient(to top left, ${color}, ${color2})`;
        });
    },
    hasList() {
      return hasListSource();
    },
    getListPath() {
      return getListSourcePath();
    },
    mute() {
      this.player.mute();
    },
  },
};
</script>

<style lang="scss" scoped>
.lyrics-page {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  z-index: 200;
  background: var(--color-body-bg);
  display: flex;
  clip: rect(auto, auto, auto, auto);
}

.lyrics-background {
  --contrast-lyrics-background: 75%;
  --brightness-lyrics-background: 150%;
}

[data-theme='dark'] .lyrics-background {
  --contrast-lyrics-background: 125%;
  --brightness-lyrics-background: 50%;
}

.lyrics-background {
  filter: blur(50px) contrast(var(--contrast-lyrics-background))
    brightness(var(--brightness-lyrics-background));
  position: absolute;
  height: 100vh;
  height: 100dvh;
  width: 100vw;
  width: 100%;

  .top-right,
  .bottom-left {
    z-index: 0;
    width: 140vw;
    height: 140vw;
    opacity: 0.6;
    position: absolute;
    background-size: cover;
  }

  .top-right {
    right: 0;
    top: 0;
    mix-blend-mode: luminosity;
  }

  .bottom-left {
    left: 0;
    bottom: 0;
    animation-direction: reverse;
    animation-delay: 10s;
  }
}

.dynamic-background > div {
  animation: rotate 150s linear infinite;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.gradient-background {
  position: absolute;
  height: 100vh;
  height: 100dvh;
  width: 100vw;
  width: 100%;
}

.left-side {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  margin-right: 32px;
  margin-top: 24px;
  align-items: center;
  transition: all 0.5s;

  z-index: 1;

  .date {
    max-width: 54vh;
    margin: 24px 0;
    color: var(--color-text);
    text-align: center;
    font-size: 4rem;
    font-weight: 600;
    opacity: 0.88;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
  }

  .controls {
    max-width: 54vh;
    margin-top: 24px;
    color: var(--color-text);

    .title {
      margin-top: 8px;
      font-size: 1.4rem;
      font-weight: 600;
      opacity: 0.88;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
    }

    .subtitle {
      margin-top: 4px;
      font-size: 1rem;
      opacity: 0.58;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
    }

    .top-part {
      display: flex;
      justify-content: space-between;

      .top-right {
        display: flex;
        justify-content: space-between;

        .volume-control {
          margin: 0 10px;
          display: flex;
          align-items: center;

          .volume-bar {
            width: 84px;
          }
        }

        .buttons {
          display: flex;
          align-items: center;

          button {
            margin: 0 0 0 4px;
          }

          .svg-icon {
            height: 18px;
            width: 18px;
          }
        }
      }
    }

    .progress-bar {
      margin-top: 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .slider {
        width: 100%;
        flex-grow: grow;
        padding: 0 10px;
      }

      span {
        font-size: 15px;
        opacity: 0.58;
        min-width: 28px;
      }
    }

    .media-controls {
      display: flex;
      justify-content: center;
      margin-top: 18px;
      align-items: center;

      button {
        margin: 0;
      }

      .svg-icon {
        opacity: 0.38;
        height: 14px;
        width: 14px;
      }

      .active .svg-icon {
        opacity: 0.88;
      }

      .middle {
        padding: 0 16px;
        display: flex;
        align-items: center;

        button {
          margin: 0 8px;
        }

        button#play .svg-icon {
          height: 28px;
          width: 28px;
          padding: 2px;
        }

        .svg-icon {
          opacity: 0.88;
          height: 22px;
          width: 22px;
        }
      }

      .lyric-switch-icon {
        color: var(--color-text);
        font-size: 14px;
        line-height: 14px;
        opacity: 0.88;
      }
    }
  }
}

.cover {
  position: relative;

  .cover-container {
    position: relative;
  }

  img {
    border-radius: 0.75em;
    width: 54vh;
    height: 54vh;
    user-select: none;
    object-fit: cover;
  }

  .shadow {
    position: absolute;
    top: 12px;
    height: 54vh;
    width: 54vh;
    filter: blur(16px) opacity(0.6);
    transform: scale(0.92, 0.96);
    z-index: -1;
    background-size: cover;
    border-radius: 0.75em;
  }
}

.right-side {
  flex: 1;
  font-weight: 600;
  color: var(--color-text);
  margin-right: 24px;
  z-index: 0;

  .lyrics-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding-left: 78px;
    max-width: 460px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    transition: 0.5s;
    scrollbar-width: none; // firefox

    .line {
      margin: 2px 0;
      padding: 12px 18px;
      transition: 0.5s;
      border-radius: 12px;

      &:hover {
        background: var(--color-secondary-bg-for-transparent);
      }

      .content {
        transform-origin: center left;
        transform: scale(0.95);
        transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        user-select: none;

        span {
          opacity: 0.28;
          cursor: default;
          font-size: 1em;
          transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        span.translation {
          opacity: 0.2;
          font-size: 0.925em;
        }
      }
    }

    .line#line-1:hover,
    .line#line-end:hover {
      background: unset;
    }

    // 底部留白，让最后几句歌词也能滚动到屏幕中间。
    // 不能用 .line:last-child，因为最后一个子元素是右键菜单 (ContextMenu)
    .line#line-end {
      flex-shrink: 0;
      height: 50vh;
      height: 50dvh;
      margin: 0;
      padding: 0;
    }

    .translation {
      margin-top: 0.1em;
    }

    .highlight div.content {
      transform: scale(1);

      span {
        opacity: 0.98;
        display: inline-block;
      }

      span.translation {
        opacity: 0.65;
      }
    }
  }

  ::-webkit-scrollbar {
    display: none;
  }

  .lyrics-container .line:first-child {
    margin-top: 50vh;
    margin-top: 50dvh;
  }
}

.close-button {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 300;
  border-radius: 0.75rem;
  height: 44px;
  width: 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.28;
  transition: 0.2s;
  -webkit-app-region: no-drag;

  .svg-icon {
    color: var(--color-text);
    padding-top: 5px;
    height: 22px;
    width: 22px;
  }

  &:hover {
    background: var(--color-secondary-bg-for-transparent);
    opacity: 0.88;
  }
}

.lyrics-page.no-lyric {
  .left-side {
    transition: all 0.5s;
    transform: translateX(27vh);
    margin-right: 0;
  }
}

@media (max-aspect-ratio: 10/9) {
  .left-side {
    display: none;
  }

  .right-side .lyrics-container {
    max-width: 100%;
  }
}

@media screen and (min-width: 1200px) {
  .right-side .lyrics-container {
    max-width: 600px;
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s;
}

.slide-up-enter,
.slide-up-leave-to

/* .fade-leave-active below version 2.1.8 */ {
  transform: translateY(100%);
}

.slide-fade-enter-active {
  transition: all 0.5s ease;
}

.slide-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.2, 0.2, 0, 1);
}

.slide-fade-enter,
.slide-fade-leave-to {
  transform: translateX(27vh);
  opacity: 0;
}
.lyrics-page.ipod-theme > .lyrics-page-bg,
.lyrics-page.ipod-theme > .lyrics-page-content {
  display: none;
}
.ipod-classic,
.ipod-touch {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 420px;
  height: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
}
.ipod-classic {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(12px + env(safe-area-inset-top))
    calc(16px + env(safe-area-inset-right))
    calc(16px + env(safe-area-inset-bottom))
    calc(16px + env(safe-area-inset-left));
  background: #f2f2f2;
}
.ipod-device {
  width: 100%;
  max-width: 360px;
  box-sizing: border-box;
  padding: 18px 14px 22px;
  border-radius: 28px;
  background: linear-gradient(180deg, #ffffff 0%, #f4f4f4 55%, #e9e9e9 100%);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 #ffffff;
}
.ipod-screen {
  padding: 10px;
  border: 6px solid #111111;
  border-radius: 6px;
  background: #eef2e6;
  color: #111111;
}
.ipod-screen-header {
  display: flex;
  gap: 10px;
}
.ipod-cover {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid #999999;
}
.ipod-meta {
  flex: 1;
  min-width: 0;
}
.ipod-title {
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ipod-artist,
.ipod-album {
  font-size: 12px;
  color: #333333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ipod-progress {
  height: 6px;
  margin-top: 10px;
  border-radius: 3px;
  background: #c8c8c8;
  cursor: pointer;
}
.ipod-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: #222222;
}
.ipod-times {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ipod-lyrics {
  height: 180px;
  margin-top: 8px;
  overflow-y: auto;
  text-align: center;
}
.ipod-lyric-line {
  padding: 4px 6px;
  font-size: 13px;
  line-height: 1.5;
  color: #555555;
  cursor: pointer;
}
.ipod-lyric-line.active {
  color: #000000;
  font-weight: 700;
}
.ipod-lyric-translation {
  font-size: 11px;
  color: #777777;
}
.ipod-wheel {
  position: relative;
  width: 240px;
  height: 240px;
  margin: 22px auto 0;
  border: 1px solid #b5b5b5;
  border-radius: 50%;
  background: radial-gradient(circle, #f5f5f5 55%, #d9d9d9 100%);
  box-shadow: inset 0 0 0 6px #ececec, 0 4px 10px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.ipod-wheel-center {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 84px;
  height: 84px;
  transform: translate(-50%, -50%);
  border: 1px solid #c9c9c9;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffffff, #e6e6e6);
  cursor: pointer;
}
.ipod-wheel-label {
  position: absolute;
  color: #666666;
  font-size: 12px;
  font-weight: 700;
  pointer-events: none;
}
.ipod-wheel-menu {
  left: 50%;
  top: 10px;
  transform: translateX(-50%);
}
.ipod-wheel-prev {
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
}
.ipod-wheel-next {
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
}
.ipod-wheel-play {
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
}
.ipod-touch {
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding: calc(12px + env(safe-area-inset-top))
    calc(20px + env(safe-area-inset-right))
    calc(20px + env(safe-area-inset-bottom))
    calc(20px + env(safe-area-inset-left));
  background: linear-gradient(180deg, #1c1c1e 0%, #000000 100%);
  color: #ffffff;
  text-align: center;
}
.ipod-touch-close {
  align-self: flex-start;
  padding: 4px 0;
  border: none;
  background: none;
  color: #0a84ff;
  font-size: 16px;
  cursor: pointer;
}
.ipod-touch-cover {
  width: min(280px, 72vw);
  aspect-ratio: 1;
  margin-top: 12px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
}
.ipod-touch-title {
  margin-top: 14px;
  font-size: 20px;
  font-weight: 700;
}
.ipod-touch-artist {
  margin-top: 4px;
  font-size: 15px;
  color: #a1a1a6;
}
.ipod-touch-progress {
  width: 100%;
  height: 6px;
  margin-top: 18px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.25);
  cursor: pointer;
}
.ipod-touch-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: #ffffff;
}
.ipod-touch-times {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 4px;
  font-size: 11px;
  color: #a1a1a6;
}
.ipod-touch-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 18px;
}
.ipod-touch-controls button {
  padding: 8px;
  border: none;
  background: none;
  color: #ffffff;
  font-size: 22px;
  cursor: pointer;
}
.ipod-touch-controls .ipod-touch-play {
  font-size: 34px;
}
.ipod-touch-controls button.active {
  color: #0a84ff;
}
.ipod-touch-volume {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-top: 16px;
}
.ipod-touch-volume-label {
  font-size: 12px;
  color: #a1a1a6;
}
.ipod-touch-volume-slider {
  flex: 1;
  accent-color: #ffffff;
}
.ipod-touch-like {
  margin-top: 14px;
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  background: none;
  color: #ffffff;
  cursor: pointer;
}
.ipod-touch-like.active {
  border-color: #ff375f;
  color: #ff375f;
}
.ipod-touch-lyrics {
  width: 100%;
  margin-top: 18px;
  padding-bottom: 24px;
  text-align: center;
}
.ipod-touch-lyrics .ipod-lyric-line {
  color: #8e8e93;
}
.ipod-touch-lyrics .ipod-lyric-line.active {
  color: #ffffff;
}
@media (max-width: 380px) {
  .ipod-wheel {
    width: 220px;
    height: 220px;
  }
  .ipod-lyrics {
    height: 150px;
  }
}
</style>
