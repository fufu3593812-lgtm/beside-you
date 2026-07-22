      function selectMood(id) {
        localStorage.setItem('bsy_mood', id);
        renderMood(id);
        moodGrid.querySelectorAll('.mp-item').forEach(function(el) {
          el.classList.toggle('selected', el.getAttribute('data-mood') === id);
        });
        setTimeout(function() {
          moodPicker.classList.remove('show');
          moodOverlay.classList.remove('show');
        }, 200);
        // Sync mood to database
        try {
          var auth = JSON.parse(localStorage.getItem('bsy_auth') || '{}');
          if (auth.token) {
            fetch(API+'/api/user/mood', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + auth.token },
              body: JSON.stringify({ mood: id })
            }).catch(function(){});
          }
        } catch(e) {}
      }
