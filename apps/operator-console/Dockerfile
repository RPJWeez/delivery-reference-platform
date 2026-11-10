FROM nginxinc/nginx-unprivileged:1.28.0-alpine@sha256:c97ff0bf7cbae369953c6da1232ec14ad9f971d66360c5698db0856a4cd657a0
COPY infra/frontend/nginx.conf /app/nginx.conf
COPY infra/frontend/default.conf.template /app/default.conf.template
COPY --chown=10001:10001 apps/operator-console/dist/ /usr/share/nginx/html/
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/bin/sh", "-ec"]
CMD ["envsubst '$API_UPSTREAM' < /app/default.conf.template > /tmp/default.conf; exec nginx -c /app/nginx.conf -g 'daemon off;'"]
