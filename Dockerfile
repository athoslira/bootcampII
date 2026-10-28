FROM nginx:alpine

COPY index.html style.css script.js favorites.js supabase.js /usr/share/nginx/html/

EXPOSE 80
