#deploy
docker stack deploy --compose-file docker-compose.yml hamyarchat

#service status
docker stack services hamyarchat


#mi
docker run -p 9000:9000 -p 9001:9001  --name minio     -e "MINIO_ROOT_USER=admin"     -e "MINIO_ROOT_PASSWORD=admin123"     quay.io/minio/minio:RELEASE.2023-11-01T01-57-10Z-cpuv1 server /data --console-address ":9001"

# for stream
docker run -p 9000:9000 -p 9001:9001 -d --name minio --restart unless-stopped -e "MINIO_ROOT_USER=admin" -e "MINIO_ROOT_PASSWORD=admin123" minio/minio server /data --console-address ":9001"
