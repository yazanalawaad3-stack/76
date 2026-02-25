// Toggle password visibility for login page
    function setupPasswordToggles() {
      document.querySelectorAll('.toggle-password').forEach(function(toggle) {
        toggle.addEventListener('click', function() {
          const targetId = this.getAttribute('data-target');
          const input = document.getElementById(targetId);
          if (!input) return;
          if (input.type === 'password') {
            input.type = 'text';
            this.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 5c-5 0-9.27 3.11-11 7.5 1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5zm0 12c-3.33 0-6.21-2.05-7.54-5 1.33-2.95 4.21-5 7.54-5 3.33 0 6.21 2.05 7.54 5-1.33 2.95-4.21 5-7.54 5z"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="2"/></svg>';
          } else {
            input.type = 'password';
            this.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 5c-5 0-9.27 3.11-11 7.5 1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5zm0 12c-3.33 0-6.21-2.05-7.54-5 1.33-2.95 4.21-5 7.54-5 3.33 0 6.21 2.05 7.54 5-1.33 2.95-4.21 5-7.54 5z"/><circle cx="12" cy="12" r="3"/></svg>';
          }
        });
      });
    }
    // Initialize international phone input on login page
    function initPhoneInputLogin() {
      if (window.intlTelInput) {
        const phoneField = document.querySelector('#phone');
        window.intlTelInput(phoneField, {
          initialCountry: 'auto',
          separateDialCode: true,
          utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js',
          geoIpLookup: function(callback) {
            fetch('https://ipapi.co/json/')
              .then(function(resp) { return resp.json(); })
              .then(function(data) {
                if (data && data.country_code) {
                  callback(data.country_code.toLowerCase());
                } else {
                  callback('lb');
                }
              }).catch(function() {
                callback('lb');
              });
          }
        });
      } else {
        setTimeout(initPhoneInputLogin, 100);
      }
    }
    window.addEventListener('load', () => {
      initPhoneInputLogin();
      setupPasswordToggles();
    });
