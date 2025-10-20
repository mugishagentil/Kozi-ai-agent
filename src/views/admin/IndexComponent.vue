<template>
    <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6" data-sidebartype="full" data-sidebar-position="fixed" data-header-position="fixed">
      <SidebarComponent />
      <div class="body-wrapper">
        <HeaderComponent/>
        <div class="container-fluid">
          <div class="row">
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import HeaderComponent from "./HeaderComponent.vue";
  import SidebarComponent from "./SidebarComponent.vue";
  
  export default {
    name: "MainWrapper",
    components: {
      SidebarComponent,
      HeaderComponent,
    },
  };
  </script>
  