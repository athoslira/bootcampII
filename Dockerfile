FROM nginx:alpine

COPY index.html style.css script.js favorites.js supabase.js stats.js comparison.js /usr/share/nginx/html/

EXPOSE 80
