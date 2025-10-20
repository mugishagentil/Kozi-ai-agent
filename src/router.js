import { createRouter, createWebHistory } from 'vue-router';

// General Views
import NotFound from './views/NotFound.vue';
import HomeComponent from './views/HomeComponent.vue';
import RoleSelector from './views/RoleSelector.vue';

import LoginComponent from './views/LoginComponent.vue';
import Login2Component from './views/Login2Component.vue';
import SignUp from './views/SignUp.vue';
import VerifyOtpPage from './views/VerifyOtpPage.vue';
import ForgotPassword from './views/ForgotPassword.vue';
import VerifyForgotOTP from './views/VerifyForgotOTP.vue';
import PasswordChange from './views/PasswordChange.vue';

// Job Seeker Views
import WelcomeComponent from './views/jobseeker/WelcomeComponent.vue';
import EditProfile from './views/jobseeker/EditProfile.vue';
import ViewProfileComponent from './views/jobseeker/ViewProfileComponent.vue';
import MyApplication from './views/jobseeker/MyApplication.vue';
import AllJobs from './views/jobseeker/AllJobs.vue';
import JobDetails from './views/jobseeker/JobDetails.vue';
import PaymentComponent from './views/jobseeker/PaymentComponent.vue';
import MessageComponent from './views/jobseeker/MessageComponent.vue';
import ChangePassword from './views/jobseeker/ChangePassword.vue';
import HeaderComponent from './views/jobseeker/HeaderComponent.vue';
import DeleteMyAccount from './views/jobseeker/DeleteMyAccount.vue'
// import HereComponent from './views/jobseeker/HereComponent.vue';

// Job Provider Views
import providerWelcomeComponent from './views/jobprovider/WelcomeComponent.vue';
import providerEditProfile from './views/jobprovider/EditProfile.vue';
import ProviderViewprofile from './views/jobprovider/ViewProfile.vue';
import AllSeekers from './views/jobprovider/All-seekers.vue';
import DetailsComponent from './views/jobprovider/DetailsComponent.vue';
import CategoryComponent from './views/jobprovider/CategoryComponent.vue';
import SeekersbasedonCategory from './views/jobprovider/SeekersbasedonCategory.vue';
import RequestSupport from './views/jobprovider/RequestSupport.vue';
import AddJobs from './views/jobprovider/AddJobs.vue';
import ChangePasswordFromProvider from './views/jobprovider/ChangePassword.vue';
import ProviderDeleteAccount from './views/jobprovider/ProviderDeleteAccount.vue'






// Admin Views
import adminlogin from './views/admin/LoginComponent.vue';
import adminindex from './views/admin/WelcomeComponent.vue';
// import adminviewseekers from './views/admin/ViewSeekers.vue';
import EditSeekersComponent from './views/admin/EditSeekersComponent.vue';
import ViewSeekersComponent from './views/admin/ViewSeekersComponent.vue';
import RegisterSeekers from './views/admin/RegisterSeekers.vue';
import HiredSeeker from './views/admin/HiredSeeker.vue';
import ApprovedSeekers from './views/admin/ApprovedSeekers.vue';
import ApprovedProviders from './views/admin/ApprovedProviders.vue'
import OpenTicket from './views/admin/OpenTicket.vue';
import ViewProviders from './views/admin/ViewProviders.vue';
import ViewprovidersComponent from './views/admin/ViewProvidersComponent.vue';
import EditProviderComponent from './views/admin/EditProviderComponent.vue';
import ViewAgent from './views/admin/ViewAgents.vue';
import RegisterAgent from './views/admin/RegisterAgent.vue';
import EditAgent from './views/admin/EditAgent.vue';
import agentDashboardComponent from './views/agent/DashboardComponent.vue';
import NewCheckComponent from './views/admin/ViewSeekers.vue';
import AvdertComponent from './views/admin/AdvertComponent.vue';
import AdminCategoryCompnent from './views/admin/CategoryComponent.vue';
import PayrollComponent from './views/admin/PayrollComponent.vue';


//////////////////////////////////////////////////////////
////Agent

import agentlogin from './views/agent/LoginComponent.vue';
import agentindex from './views/agent/DashboardComponent.vue';
import agentviewseekers from './views/agent/ViewSeekers.vue';
import AgentEditSeeker from './views/agent/EditSeekers.vue';
import ViewSeekerMore from './views/agent/ViewSeekerMore.vue';
import AgentRegisterSeeker from './views/agent/RegisterSeeker.vue';
import AgentChangePassword from './views/agent/ChangePassword.vue';
import AgentMyProfile from './views/agent/ViewProfileComponent.vue';





import RegisterProvider from './views/admin/RegisterProvider.vue';
///jobs
import RegisterJob from './views/admin/RegisterJob.vue';
import AdminJobDetails from './views/admin/JobDetails';
import UnPublishedJOb from './views/admin/UnPublishedJob.vue';
import JobApplicant from './views/admin/JobApplicant.vue';
import MoreAgent from './views/admin/MoreAgent.vue';

///generate cv
import GenerateCV from './views/jobseeker/GenerateCV.vue';

//chatbot pages - integrated in dashboard
import JobSeekerAIChatPage from './views/jobseeker/ai-chatbot/AIChatPage.vue';
import JobProviderAIChatPage from './views/jobprovider/ai-chatbot/AIChatPage.vue';
import AdminAIChatPage from './views/admin/AIChatPage.vue';
import AgentAIChatPage from './views/agent/AIChatPage.vue';





const routes = [
  { path: '/home', name: 'Home', component: HomeComponent,meta: { title: 'Choose Role - Kozi Rwanda'} },
  { path: '/', name: 'here', component: RoleSelector,meta: { title: 'Choose Role - Kozi Rwanda'} },
  { path: '/role-selector', name: 'heree', component: RoleSelector,meta: { title: 'Choose Role - Kozi Rwanda'} },
  { path: '/login', name: 'login', component: LoginComponent,meta: { title: 'Login - Kozi Rwanda'}  },
  { path: '/login2', name: 'login2', component: Login2Component },

  { path: '/signup', name: 'signup', component: SignUp,meta: { title: 'Sign up - Kozi Rwanda'} },

  { path: '/verify-otp', name: 'verify-otp', component: VerifyOtpPage,meta: { title: 'Verify OTP - Kozi Rwanda'}  },

  { path: '/forgot-password', name: 'forgot-password', component: ForgotPassword,meta: { title: 'Forgot password - Kozi Rwanda'} },

  { path: '/verify-forgot-otp', name: 'verify-forgot-otp', component: VerifyForgotOTP,meta: { title: 'Verify OTP - Kozi Rwanda'}},
  { path: '/password-change', name: 'password-change', component: PasswordChange,meta: { title: 'Change Password - Kozi Rwanda'} },
  { path: '/header', name: 'header', component: HeaderComponent },

  // Job Seeker Routes
  { path: '/dashboard/', name: 'dashboards/', component: WelcomeComponent, meta: { title: 'Dashboard - Job Seeker', noHeaderFooter: true, requiresAuth: true } },
  { path: '/dashboard/Edit-Profile', name: 'edit-profile', component: EditProfile, meta: { title: 'Edit Profile - Job Seeker', noHeaderFooter: true, requiresAuth: true } },

  { path: '/dashboard/View-profile', name: 'view-profile', component: ViewProfileComponent, meta: { title: 'View Profile - Job Seeker', noHeaderFooter: true, requiresAuth: true } },
  { path: '/dashboard/My-application', name: 'my-application', component: MyApplication, meta: { title: 'My Application - Job Seeker', noHeaderFooter: true, requiresAuth: true } },

  { path: '/dashboard/All-jobs', name: 'all-jobs', component: AllJobs, meta: { title: 'All Jobs - Job Seeker', noHeaderFooter: true, requiresAuth: true } },

   { path: '/dashboard/settings', name: 'settings', component: DeleteMyAccount, meta: { title: 'All Jobs - Job Seeker', noHeaderFooter: true, requiresAuth: true } },

  { path: '/dashboard/generate-cv', name: 'generate-cv', component: GenerateCV, meta: { title: 'Generate CV - Job Seeker', noHeaderFooter: true, requiresAuth: true } },
  { path: '/dashboard/ai-agent', name: 'ai-agent-jobseeker', component: JobSeekerAIChatPage, meta: { title: 'AI Agent - Job Seeker', noHeaderFooter: true, requiresAuth: true } },

 




  // { path: '/dashboard/Read-more/:job_id', name: 'job-details', component: JobDetails, meta: { title: 'Job Details - Job Seeker', noHeaderFooter: true, requiresAuth: true } },

  { path: '/career/:job_id', name: 'job-details', component: JobDetails, meta: { title: 'Job Details - Job Seeker', noHeaderFooter: true, requiresAuth: true } },

  { path: '/dashboard/payment', name: 'payment', component: PaymentComponent, meta: { title: 'Payment - Job Seeker', noHeaderFooter: true, requiresAuth: true } },

  { path: '/dashboard/message', name: 'message', component: MessageComponent, meta: { title: 'Message - Job Seeker', noHeaderFooter: true, requiresAuth: true } },

  { path: '/dashboard/change-password', name: 'change-password-jobseeker', component: ChangePassword, meta: { title: 'Change Password - Job Seeker', noHeaderFooter: true, requiresAuth: true } },

  // Job Provider Routes
  { path: '/employer/dashboard', name: 'provider-dashboard', component: providerWelcomeComponent, meta: { title: 'Dashboard - Job Provider', noHeaderFooter: true, requiresAuth: true } },
  { path: '/employer/edit-profile', name: 'provider-edit-profile', component: providerEditProfile, meta: { title: 'Edit Profile - Job Provider', noHeaderFooter: true, requiresAuth: true } },
  { path: '/employer/view-profile', name: 'provider-view-profile', component: ProviderViewprofile, meta: { title: 'View Profile - Job Provider', noHeaderFooter: true, requiresAuth: true } },
  { path: '/employer/seekers', name: 'provider-seekers', component: AllSeekers, meta: { title: ' All  Seekers - Job Provider', noHeaderFooter: true, requiresAuth: true } },
  { path: '/employer/seekers/:users_id', name: 'seeker-details', component: DetailsComponent, meta: { title: 'Seeker Info - Job Provider', noHeaderFooter: true, requiresAuth: true } },
  { path: '/employer/category', name: 'provider-categories', component: CategoryComponent, meta: { title: 'Categories - Job Provider', noHeaderFooter: true, requiresAuth: true } },
  { path: '/employer/category/:category_id', name: 'seekers-by-category', component: SeekersbasedonCategory, meta: { title: 'Seekers by Category - Job Provider', noHeaderFooter: true, requiresAuth: true } },
  { path: '/employer/support', name: 'support', component: RequestSupport, meta: { title: 'Support - Job Provider', noHeaderFooter: true, requiresAuth: true } },
  { path: '/employer/add-job', name: 'add-job', component: AddJobs, meta: { title: 'Add Job - Job Provider', noHeaderFooter: true, requiresAuth: true } },

  { path: '/employer/change-password', name: 'change-password-provider', component: ChangePasswordFromProvider, meta: { title: 'Change Password - Job Provider', noHeaderFooter: true, requiresAuth: true } },

  { path: '/employer/ai-agent', name: 'ai-agent-provider', component: JobProviderAIChatPage, meta: { title: 'AI Agent - Job Provider', noHeaderFooter: true, requiresAuth: true } },


    { path: '/employer/settings', name: 'delete-account', component: ProviderDeleteAccount, meta: { title: 'Settings - Job Provider', noHeaderFooter: true, requiresAuth: true } },




  // Admin Routes
  { path: '/admin/view-seekers', name: 'checkkkkadmin-register-seekers', component: NewCheckComponent, meta: { title: 'All Seekers - Admin', noHeaderFooter: true, requiresAuth: true } },

  { path: '/admin/check', name: 'admin-view-seekers', component: NewCheckComponent, meta: { title: 'View Seekers - Admin', noHeaderFooter: true, requiresAuth: true } },

  { path: '/admin', name: 'admin-login', component: adminlogin, meta: { title: 'Admin Login - Kozi Rwanda', noHeaderFooter: true } }, 
  
  { path: '/admin/index', name: 'admin-index', component: adminindex, meta: { title: 'Dashboard - Admin', noHeaderFooter: true, requiresAuth: true } },
  
  { path: '/admin/register-seeker', name: 'admin-register-seekers', component: RegisterSeekers, meta: { title: 'Register Seeker - Admin', noHeaderFooter: true, requiresAuth: true } },
  
  { path: '/admin/hired-seeker', name: 'hired-seekers', component: HiredSeeker, meta: { title: 'Hired Seeker - Admin', noHeaderFooter: true, requiresAuth: true } },
  
  { path: "/admin/edit-seekers/:id", name: "edit-seekers", component: EditSeekersComponent, meta: {title:'Edit Job Seeker - Admin', noHeaderFooter: true, requiresAuth: true } },


{ path: "/admin/view-seekers/:id", name: "view-seekers",component: ViewSeekersComponent, meta: {title:'View Seekers - Admin', noHeaderFooter: true, requiresAuth: true }},


{ path: "/admin/view-more/:id", name: "view-more", component: ViewprovidersComponent,meta: { title: 'Admin Index - Kozi Rwanda', noHeaderFooter: true, requiresAuth: true }  },

  { path: '/admin/payroll', name: 'payroll', component: PayrollComponent, meta: { title: 'Payroll - Admin', noHeaderFooter: true, requiresAuth: true } },





  //provider
  { path: '/admin/approved-user', name: 'approved-seekers', component: ApprovedSeekers, meta: { title: 'Approved Seekers - Admin', noHeaderFooter: true, requiresAuth: true } },

  { path: '/admin/approved-providers', name: 'admin/approved-providers', component: ApprovedProviders, meta: { title: 'Approved Providers - Admin', noHeaderFooter: true, requiresAuth: true } },

   { path: '/admin/open-tickets', name: 'open-ticket', component: OpenTicket, meta: { title: 'Open Ticket - Admin', noHeaderFooter: true, requiresAuth: true } },

   { path: '/admin/view-provider', name: 'view-providers', component: ViewProviders, meta: { title: 'View Provider - Admin', noHeaderFooter: true, requiresAuth: true } },

   { path: "/admin/view-more/:id", name: "view-more", component: ViewprovidersComponent,meta: { title: 'Provider Info - Admin', noHeaderFooter: true, requiresAuth: true }  },

  { path: "/admin/edit-providers/:id", name: "edit-providers", component: EditProviderComponent,meta: { title: 'Edit provider - Admin', noHeaderFooter: true, requiresAuth: true } },

   { path: '/admin/register-provider', name: 'register-provider', component: RegisterProvider, meta: { title: 'Register Provider - Admin', noHeaderFooter: true, requiresAuth: true } },

   { path: "/admin/more-agent/:id", name: "more-agent", component: MoreAgent,meta: { title: 'Agent Info - Admin', noHeaderFooter: true, requiresAuth: true }  },

   { path: "/admin/edit-agent/:id", name: "edit-agent", component: EditAgent,meta: { title: 'Edit Agent - Admin', noHeaderFooter: true, requiresAuth: true } },

  //agent
   { path: '/admin/view-agent', name: 'view-agent', component: ViewAgent, meta: { title: 'View Agent - Admin', noHeaderFooter: true, requiresAuth: true } },

  { path: '/admin/register-agent', name: 'register-agent', component: RegisterAgent, meta: { title: 'Register Agent - Admin', noHeaderFooter: true, requiresAuth: true } },

  //jobs
    { path: '/admin/Register-jobs', name: 'Register-jobs ', component: RegisterJob, meta: { title: 'Register Jobs - Admin', noHeaderFooter: true, requiresAuth: true } },

    { path: '/admin/job-details/:id', name: 'admin/job-details', component: AdminJobDetails, meta: { title: 'Job Info - Admin', noHeaderFooter: true, requiresAuth: true } },

     { path: '/admin/unpublished-job/', name: 'admin/unpublished', component: UnPublishedJOb, meta: { title: 'Unpublished Job - Admin', noHeaderFooter: true, requiresAuth: true } },

     { path: '/admin/Job-Applicants/', name: 'admin/JObapplicant', component: JobApplicant, meta: { title: 'Job Applicant - Admin', noHeaderFooter: true, requiresAuth: true } },

     


     //category
     
     { path: '/admin/advert/', name: 'admin/advert', component: AvdertComponent, meta: { title: 'Advert - Admin', noHeaderFooter: true, requiresAuth: true } },

     { path: '/admin/category/', name: 'admin/category', component: AdminCategoryCompnent, meta: { title: 'Category - Admin', noHeaderFooter: true, requiresAuth: true } },

     { path: '/admin/ai-agent', name: 'ai-agent-admin', component: AdminAIChatPage, meta: { title: 'AI Agent - Admin', noHeaderFooter: true, requiresAuth: true } },




//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////agent

 { path: '/agent', name: 'agent-login', component: agentlogin, meta: { title: 'Agent Login - Kozi Rwanda', noHeaderFooter: true } },

 { path: '/agent/index', name: 'agent-index', component: agentindex, meta: { title: 'Agent Index - Kozi Rwanda', noHeaderFooter: true, requiresAuth: true } },

 { path: '/agent/view-seekers', name: 'admin-view-seekers', component: agentviewseekers, meta: { title: 'View Seekers - Kozi Rwanda', noHeaderFooter: true, requiresAuth: true } },

 { path: '/agent/dashboard', name: 'agent-dashboard', component: agentDashboardComponent, meta: { title: 'View Seekers - Kozi Rwanda', noHeaderFooter: true, requiresAuth: true } },

 { path: '/agent/agent-edit-seekers/:id', name: 'agent/agent-edit-seekers', component: AgentEditSeeker, meta: { title: 'View Seekers - Kozi Rwanda', noHeaderFooter: true, requiresAuth: true } },


{ path: '/agent/agent-view-seekers/:id', name: 'agent/agent-view-seekers', component: ViewSeekerMore, meta: { title: 'View Seekers - Kozi Rwanda', noHeaderFooter: true, requiresAuth: true } },

{ path: '/agent/register-seeker', name: 'agent/register-seeker', component: AgentRegisterSeeker, meta: { title: 'View Seekers - Kozi Rwanda', noHeaderFooter: true, requiresAuth: true } },

 {path:'/agent/change-password',name: 'agent/change-password',component: AgentChangePassword,meta:{title: 'Change-password- Kozi Rwanda',noHeaderFooter:true, RequiredAuth:true }},

 {path:'/agent/My-profile',name: 'agent/My-profile',component: AgentMyProfile,meta:{title: 'Change-password- Kozi Rwanda',noHeaderFooter:true, RequiredAuth:true }},

 {path:'/agent/ai-agent',name: 'ai-agent-agent',component: AgentAIChatPage,meta:{title: 'AI Agent - Agent',noHeaderFooter:true, requiresAuth:true }},

 
  

 




    
  

   









  // 404 Page
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: { title: '404 - Page Not Found', noHeaderFooter: false, requiresAuth: false }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const employeeToken = localStorage.getItem('employeeToken');
  const employerToken = localStorage.getItem('employerToken');
  const adminToken = localStorage.getItem('adminToken');
  const agentToken = localStorage.getItem('agentToken');
  const employeeRoleId = localStorage.getItem('employeeRoleId');
  const employerRoleId = localStorage.getItem('employerRoleId');
  const adminRoleId = localStorage.getItem('adminRoleId');
  const agentRoleId = localStorage.getItem('agentRoleId');
  const requiresAuth = to.meta.requiresAuth;
  const isAdminRoute = to.path.startsWith('/admin');
  const isAgentRoute = to.path.startsWith('/agent');
  const isEmployerRoute = to.path.startsWith('/employer') || to.path.startsWith('/jobprovider');

  // Admin dashboard redirects
  if (to.path === '/admin' && adminToken && adminRoleId === "3") {
    next('/admin/index');
    return;
  }

  // Agent dashboard redirects
  if (to.path === '/agent' && agentToken && agentRoleId === "4") {
    next('/agent/index');
    return;
  }

  if (requiresAuth) {
    // Admin routes
    if (isAdminRoute) {
      if (adminToken && adminRoleId === "3") {
        next();
      } else {
        next('/admin');
      }
      return;
    }

    // Agent routes
    if (isAgentRoute) {
      if (agentToken && agentRoleId === "4") {
        next();
      } else {
        next('/agent');
      }
      return;
    }

    // Employer routes
    if (isEmployerRoute) {
      if (employerToken && employerRoleId === "2") {
        next();
      } else {
        next('/login');
      }
      return;
    }

    // Employee routes (default)
    if (employeeToken && employeeRoleId === "1") {
      next();
    } else {
      next('/login');
    }
    return;
  }

  // No auth required
  next();
});

router.afterEach((to) => {
  const defaultTitle = 'Kozi rwanda';
  document.title = to.meta.title || defaultTitle;
});


export default router;
