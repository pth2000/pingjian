<script setup>
/* 整个页面：侧栏（电脑）/ 顶栏 + 底部页签（手机）、各页、确认弹框、提示条。
   对弈、定式、杀法三页常驻（画布和对局状态一直在）；其余各页由路由挂上（router.js）。
   页面切换走 ui/views.js 的 showView() / go()，路由跟着走。 */
import SideNav from './components/shell/SideNav.vue';
import TopBar from './components/shell/TopBar.vue';
import TabBar from './components/shell/TabBar.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import AppToast from './components/AppToast.vue';
import AchToast from './components/AchToast.vue';
import StoryLayer from './components/story/StoryLayer.vue';
import GameView from './views/GameView.vue';
import ShafaView from './views/ShafaView.vue';
import DingshiView from './views/DingshiView.vue';
</script>

<template>
  <div class="shell">
    <SideNav/>
    <div class="app">
      <TopBar/>
      <GameView/>
      <ShafaView/>
      <DingshiView/>
      <RouterView v-slot="{ Component, route }">
        <Transition name="page" mode="out-in"><component :is="Component" :key="route.name"/></Transition>
      </RouterView>
      <ConfirmModal/>
    </div>
  </div>
  <TabBar/>
  <AppToast/>
  <StoryLayer/>
  <AchToast/>
</template>
