<!--  -->

docker build -t distributed-app .

docker run -p 4000:4000 --env-file .env.local varshithknaik/distibuted-order-app

<!-- Example to reset the migration -->

npx dotenv-cli -e .env.local -- sh -c 'cd apps/order-service && npx prisma migrate reset --force'

## Kafka Replay

### Approach 1

1. stop the consumer from consuming the messages.

kill `npm run dev:local`

2. reset the offsets of the consumer. Exec into the Kafka container and run

```bash
  kafka-consumer-groups.sh \
    --bootstrap-server localhost:9092 \
    --group read-service-users \
    --topic user.events:0 \
    --reset-offsets --to-offset 7 \
    --execute
```

(Add --command-config with your SSL props if using mTLS)

3. Restart the order-service it will re-consume from offset 7.

| Field      | Value                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Advantages | Zero code changes; standard Kafka ops; replays offset 7 + all subsequent messages                                                |
| Drawbacks  | Requires stopping the consumner first; replays everything from 7 onwords ( not just 7 ); your `processEvent` must be idempotent. |
| Risk level | Low - standard kaka operations                                                                                                   |

### Approach 2 Ephemeral consumer Replay the consumer in Code ( consumer.seek())

Instead of resetting the offset of the main consumer group, this approach creates a separate
temporary consumer inside the application and uses `consumer.seek()` to start consuming from
desired offset. In general, this is useful when we want a controlled replay of old kafka
messages without disturbing the the normal running consumer. Rather than changing shared group
offsets at the Kafka level, we handle replay directly in code.

1. Add a `replayFromOffset(offset,partition, stopAfter?)` function in user-consumer.ts
2. Add a `replay.ts` script that parses CLI args and calls `replayFromOffset("7" , 0 , 1)`
3. Add an npm script like `"replay:order": "dotenv -e .env.local -- npx tsx apps/order-service/src/replay.ts --offset 7 --partition 0"`
4. Run it — it creates an ephemeral group, processes just the missed message(s), then stops

`replay.ts` — standalone CLI script so you can `run npm run replay:order -- --offset 7 --partition 0 --stop-after`

# Replay Job in GCP

```bash
gcloud run jobs create replay-order \
  --image <your-image>:latest \
  --command "node" \
  --args "apps/order-service/dist/replay.js" \
  --set-env-vars "REPLAY_OFFSET=7,REPLAY_PARTITION=0,REPLAY_STOP_AFTER=1" \
  --region <your-region>

# Execute it (each time you need a replay)
gcloud run jobs execute replay-order \
  --update-env-vars "REPLAY_OFFSET=7,REPLAY_PARTITION=0,REPLAY_STOP_AFTER=1"
```

Note: We have to use the image that has the event replay code.
