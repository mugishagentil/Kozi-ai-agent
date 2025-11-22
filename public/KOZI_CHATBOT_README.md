# Kozi Chatbot - Standalone HTML5 Version

This is a standalone HTML5 chatbot that can be embedded in any HTML page. It includes all CSS and JavaScript inline, making it completely independent.

## 📁 File Location
`/public/kozi-chatbot.html`

## ⚙️ Setup Instructions

### 1. Add Your OpenAI API Key

Open `kozi-chatbot.html` and find this line around line 469:

```javascript
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';
```

Replace `YOUR_OPENAI_API_KEY_HERE` with your actual OpenAI API key:

```javascript
const OPENAI_API_KEY = 'sk-proj-xxxxxxxxxxxxxxxxxxxxx';
```

### 2. Update Logo Path (Optional)

The logo is set to `/generative.png`. If your logo is in a different location, update line 429:

```html
<img src="/generative.png" alt="AI" class="kozi-header-logo" ...>
```

Change `/generative.png` to your logo path, or leave it as is - it will fallback to a simple SVG if the image is not found.

## 🚀 How to Use

### Option 1: Standalone Page
Simply open `kozi-chatbot.html` in a browser or serve it from your web server.

### Option 2: Embed in Your HTML Page

#### Method A: Include via Script Tag (Recommended)
Copy the entire contents of `kozi-chatbot.html` and paste it into your HTML page, or use a script tag to load it:

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Your existing head content -->
</head>
<body>
    <!-- Your existing page content -->
    
    <!-- Include the chatbot -->
    <script src="path/to/kozi-chatbot.html" type="text/html" id="chatbot-template"></script>
    <script>
        // Load chatbot content
        const template = document.getElementById('chatbot-template').textContent;
        document.body.insertAdjacentHTML('beforeend', template);
    </script>
</body>
</html>
```

#### Method B: Direct Copy-Paste
1. Open `kozi-chatbot.html`
2. Copy everything from `<div id="koziChatWidget"` to the closing `</script>` tag
3. Paste it just before the closing `</body>` tag of your HTML page

#### Method C: Iframe (Simple but less flexible)
```html
<iframe 
    src="kozi-chatbot.html" 
    style="position: fixed; bottom: 20px; left: 20px; width: 350px; height: 500px; border: none; z-index: 9999;">
</iframe>
```

## 📋 Features

✅ **Complete Standalone** - No dependencies except Font Awesome CDN  
✅ **All Styles Embedded** - CSS included inline  
✅ **Vanilla JavaScript** - No frameworks required  
✅ **Direct OpenAI API** - Calls OpenAI API directly  
✅ **Conversation History** - Maintains context across messages  
✅ **Responsive Design** - Works on mobile and desktop  
✅ **Error Handling** - Graceful fallback messages  
✅ **Typing Indicator** - Shows when AI is responding  
✅ **Quick Suggestions** - Pre-defined question buttons  

## 🎨 Customization

### Change Colors
The main Kozi color (`#E41E79`) is used throughout. To change it, search and replace:
- `#E41E79` - Main pink color
- `#C0126E` - Darker pink for gradients

### Change Widget Position
Edit the CSS around line 10:

```css
.kozi-chat-widget {
    bottom: 20px;  /* Distance from bottom */
    left: 20px;    /* Distance from left */
    /* Change to 'right: 20px' for bottom-right position */
}
```

### Change Widget Size
Edit around line 32:

```css
.kozi-chat-window {
    width: 350px;   /* Widget width */
    height: 480px;  /* Widget height */
}
```

## 🔒 Security Notes

⚠️ **Important**: The OpenAI API key is hardcoded in the HTML file. This means:

1. **Anyone can view your API key** by inspecting the page source
2. **Your API usage costs** will be public if someone uses your key
3. **Consider these alternatives**:
   - Use environment variables (if server-side)
   - Create a proxy API endpoint to hide the key
   - Use rate limiting on your server
   - Set usage limits on your OpenAI account

## 🐛 Troubleshooting

### Chatbot not appearing
- Check browser console for JavaScript errors
- Ensure Font Awesome CDN is accessible
- Verify the HTML structure is correct

### API errors
- Verify your OpenAI API key is correct
- Check your OpenAI account has credits
- Ensure you have internet connection
- Check browser console for specific error messages

### Logo not showing
- Verify the logo path is correct
- Check if the image file exists
- The widget will show a fallback SVG if image is missing

## 📞 Support

For issues or questions:
- Phone: +250 788 719 678
- Email: info@kozi.rw

## 📝 License

This chatbot is part of the Kozi platform.

