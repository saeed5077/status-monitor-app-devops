import redis.asyncio as redis
from app.core.config import get_settings

settings = get_settings()
redis_client = None


async def get_redis():
    global redis_client
    if redis_client is None:
        redis_client = await redis.from_url(settings.REDIS_URL, decode_responses=True)
    return redis_client


async def publish_message(channel: str, message: str):
    r = await get_redis()
    await r.publish(channel, message)


async def subscribe_channel(channel: str):
    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe(channel)
    return pubsub
