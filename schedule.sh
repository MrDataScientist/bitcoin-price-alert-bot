while true
do
	node app.js &
	PID=$!
	sleep 86400
	kill $PID
done
