<template>
    <div class="container" :class="{ active: isRegistering }">
      <!-- Login Form -->
      <div class="form-box login">
        <form @submit.prevent="handleLogin">
          <h1>Login</h1>
          <div class="input-box">
            <input type="email" v-model="loginForm.email" placeholder="Email" required />
            <i class="bx bxs-envelope"></i>
          </div>
          <div class="input-box">
            <input type="password" v-model="loginForm.password" placeholder="Password" required />
            <i class="bx bxs-lock-alt"></i>
          </div>
          <div class="recaptcha">
            <div class="g-recaptcha" :data-sitekey="recaptchaSiteKey"></div>
          </div>
          <button class="btn" type="submit">Login</button>
          <div class="social-icons">
            <button class="google-button" type="button">
              <img src="img/google.png" alt="Google Login" />
            </button>
          </div>
        </form>
      </div>
  
      <!-- Register Form -->
      <div class="form-box register">
        <form @submit.prevent="handleRegister">
          <h1>Registration</h1>
          <div class="input-box" v-for="field in registerFields" :key="field.name">
            <input :type="field.type" v-model="registerForm[field.name]" :placeholder="field.placeholder" required />
            <i :class="field.icon"></i>
          </div>
          <div class="recaptcha">
            <div class="g-recaptcha" :data-sitekey="recaptchaSiteKey"></div>
          </div>
          <button class="btn" type="submit">Register</button>
          <div class="social-icons">
            <button class="google-button" type="button">
              <img src="img/google.png" alt="Google Login" />
            </button>
          </div>
        </form>
      </div>
  
      <!-- Toggle Panel -->
      <div class="toggle-box">
        <div class="toggle-panel toggle-left">
          <h1>Hello, Welcome!</h1>
          <p>Don't have an Account?</p>
          <button class="btn" @click="isRegistering = true">Register</button>
        </div>
        <div class="toggle-panel toggle-right">
          <h1>Welcome back!</h1>
          <p>Already have an Account?</p>
          <button class="btn" @click="isRegistering = false">Login</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        isRegistering: false,
        recaptchaSiteKey: '6Lc-YLMqAAAAABmJD7EYyZYjbRPCzX4M4eiia-nY',
        loginForm: {
          email: '',
          password: '',
        },
        registerForm: {
          email: '',
          telephone: '',
          first_name: '',
          last_name: '',
          password: '',
        },
        registerFields: [
          { name: 'email', placeholder: 'Email', type: 'email', icon: 'bx bxs-envelope' },
          { name: 'telephone', placeholder: 'Telephone', type: 'text', icon: 'bx bxs-phone' },
          { name: 'first_name', placeholder: 'First Name', type: 'text', icon: 'bx bxs-user' },
          { name: 'last_name', placeholder: 'Last Name', type: 'text', icon: 'bx bxs-user' },
          { name: 'password', placeholder: 'Password', type: 'password', icon: 'bx bxs-lock-alt' },
        ]
      };
    },
    methods: {
      async handleLogin() {
        const response = await this.verifyRecaptcha();
        if (!response.success) {
          alert("reCAPTCHA verification failed. Please try again.");
          return;
        }
        // Replace with actual login API call
        console.log("Logging in with:", this.loginForm);
      },
      async handleRegister() {
        const response = await this.verifyRecaptcha();
        if (!response.success) {
          alert("reCAPTCHA verification failed. Please try again.");
          return;
        }
        // Replace with actual register API call
        console.log("Registering with:", this.registerForm);
      },
      
    }
  };
  </script>
  
  <style scoped>
  
  @import url('https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css');

  .google-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px; /* Space between the icon and text */
  background-color: #BDBFC2; /* Google blue */
  color: #fff;
  border: none;
  border-radius: 5px;
  height: 40px; /* Set the button height */
  width: 250px; /* Set the button width */
  font-size: 16px;
  font-family: Arial, sans-serif;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding-top:-7px;
}

.social-icons .google-button:hover {
  background-color: #3367D6; /* Darker Google blue on hover */
  transform: translateY(-2px);
}

.social-icons .google-button:active {
  transform: translateY(0); /* Reset when clicked */
}

.social-icons .google-icon img{
  width: 20px;
  height: 20px;
}
.google-button img{
    width: 20px;
  height: 20px;
}

.btn-text {
    text-decoration: none;
    color: inherit; 
}


@media screen and (max-width: 600px) {
    form {
        text-align: center;
    }

    .google-button {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
        margin-top: 1rem;
        padding: 10px 20px;
        border: 1px solid #ccc;
        border-radius: 5px;
        background-color: #fff;
        cursor: pointer;
        text-align: center;
        width: fit-content;
    }

    .google-icon {
        width: 20px;
        height: 20px;
        margin-right: 10px;
    }

    .btn-text {
        text-decoration: none;
        color: #000;
        font-weight: bold;
    }
}


  *{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Poppins', sans-serif;
}

body{
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(90deg, #e2e2e2, #c9d6ff);
}

.container{
    position: relative;
    width : 950px;
    height : 550px;
    background : #fff;
    border-radius : 30px;
    box-shadow : 0 0 30px rgba(0, 0, 0, .2);
    overflow: hidden;
    margin: 20px;
}

.form-box{
    position: absolute;
    right: 0;
    width: 50%;
    height: 100%;
    background: #fff;
    display: flex;
    align-items: center;
    color: #333;
    text-align: center;
   
    z-index: 1;
    transition: .6s ease-in-out 1.2s, visibility 0s 1s;
}

.container.active .form-box{
    right: 50%;
}

.form-box.register{
    visibility: hidden;
}

.container.active .form-box.register{
    visibility: visible;
}

form{
    width: 100%;
}

.container h1{
    font-size: 36px;
    margin: -10px 0;
}

.input-box{
    position: relative;
    margin: 10px 0;
}

.input-box input{
    width: 80%;
    padding: 13px 0px 13px 20px;
    background: #eee;
    border-radius: 8px;
    border: none;
    outline: none;
    font-size: 16px;
    color: #333;
    font-weight: 500;
}

.input-box input::placeholder {
    color: #888;
    font-weight: 400;

}

.input-box i{
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
}

.forgot-link{
    margin: -15px 0 15px;
}

.forgot-link a{
    font-size: 14.5px;
    color: #333;
    text-decoration: none;
}

.btn{
    width: 50%;
    height: 48px;
    background: cadetblue;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0, 0, 0, .1);
    border: none;
    cursor: pointer;
    font-size: 16px;
    color: #fff;
    font-weight: 600;
}

.container p{
    font-size: 14.5px;
    margin: 15px 0;
}

.social-icons{
    display: flex;
    justify-content: center;
}

.social-icons a{
    display: inline-flex;
    padding: 10px;
    border: 2px solid #ccc;
    border-radius: 8px;
    font-size: 24px;
    color: #333;
    text-decoration: none;
    margin: 0 8px;
}

.toggle-box{
    position: absolute;
    width: 100%;
    height: 100%;
}

.toggle-box::before{
    content: '';
    position: absolute;
    left: -250%;
    width: 300%;
    height: 100%;
    background: #EA60A7;
    border-radius: 150px;
    z-index: 2;
    transition: 1.8s ease-in-out;
}

.container.active .toggle-box::before{
    left: 50%;
}

.toggle-panel{
    position: absolute;
    width: 50%;
    height: 100%;
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 2;
    transition: .6s ease-in-out;
}

.toggle-panel.toggle-left{
    left: 0;
    transition-delay: 1.2s;
}

.container.active .toggle-panel.toggle-left{
    left: -50%;
    transition-delay: .6s;
}

.toggle-panel.toggle-right{
    right: -50%;
    transition-delay: .6s;
}

.container.active .toggle-panel.toggle-right{
    right: 0;
    transition-delay: 1.2s;
}

.toggle-panel p{
    margin-bottom: 20px;
}

.toggle-panel .btn{
    width: 160px;
    height: 46px;
    background: transparent;
    border: 2px solid #fff;
    box-shadow: none;
}

@media screen and (max-width: 650px) {
    
    .container{
    position: relative;
    width : 1000px;
    height : 850px;
    background : #fff;
    border-radius : 30px;
    box-shadow : 0 0 30px rgba(0, 0, 0, .2);
    overflow: hidden;
    margin: 20px;
}

    .form-box{
        bottom: 0;
        width: 100%;
        height: 50%;
    }

    .container.active .form-box{
        right: 0;
        bottom: 30%;
    }

    .toggle-box::before{
        left: 0;
        top: -270%;
        width: 100%;
        height: 300%;
        border-radius: 20vw;
    }

    .container.active .toggle-box::before{
        left: 0;
        top: 70%;
    }

    .toggle-panel{
        width: 100%;
        height: 30%;
    }

    .toggle-panel.toggle-left{
        top: 0;
    }

    .container.active .toggle-panel.toggle-left{
        top: -30%;
        left: 0;
    }

    .toggle-panel.toggle-right{
        right: 0;
        bottom: -30%;
    }

    .container.active .toggle-panel.toggle-right{
        bottom: 0;
    }
}

@media screen and (max-width:400px){
    .form-box{
        padding: 20px;
    }

    .toggle-panel h1{
        font-size: 30px;
    }
}


    @media (max-width: 480px) {
        .g-recaptcha {
            transform: scale(0.80); 
            max-width: 300px; 
        }
    }


  </style>
  