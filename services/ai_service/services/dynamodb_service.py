from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key

from config import settings


def get_dynamodb_resource():
    endpoint = settings.DYNAMODB_ENDPOINT or None

    return boto3.resource(
        "dynamodb",
        region_name=settings.AWS_REGION,
        endpoint_url=endpoint,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def ensure_table_exists():
    dynamodb = get_dynamodb_resource()
    table_name = settings.DYNAMODB_TABLE_NAME

    try:
        dynamodb.meta.client.describe_table(TableName=table_name)
    except dynamodb.meta.client.exceptions.ResourceNotFoundException:
        dynamodb.create_table(
            TableName=table_name,
            KeySchema=[
                {"AttributeName": "ConversationID", "KeyType": "HASH"},
                {"AttributeName": "Timestamp", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "ConversationID", "AttributeType": "S"},
                {"AttributeName": "Timestamp", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )


def normalize_message(item: dict) -> dict:
    return {
        "conversation_id": item["ConversationID"],
        "role": item["Role"],
        "message": item["Message"],
        "timestamp": item["Timestamp"],
        "channel": item.get("Channel", "web"),
    }


def save_chat_message(
    *,
    conversation_id: str,
    tenant_id: str,
    user_id: str,
    role: str,
    message: str,
    channel: str,
) -> dict | None:
    try:
        ensure_table_exists()
        dynamodb = get_dynamodb_resource()
        table = dynamodb.Table(settings.DYNAMODB_TABLE_NAME)
        timestamp = datetime.now(timezone.utc).isoformat()

        item = {
            "ConversationID": conversation_id,
            "Timestamp": timestamp,
            "TenantID": str(tenant_id),
            "UserID": str(user_id),
            "Role": role,
            "Message": message,
            "Channel": channel,
        }
        table.put_item(Item=item)

        response = table.query(
            KeyConditionExpression=Key("ConversationID").eq(conversation_id),
            ScanIndexForward=True,
        )
        messages = response.get("Items", [])
        capacity = 100

        if len(messages) > capacity:
            messages_to_delete = messages[: len(messages) - capacity]
            with table.batch_writer() as batch:
                for entry in messages_to_delete:
                    batch.delete_item(
                        Key={
                            "ConversationID": entry["ConversationID"],
                            "Timestamp": entry["Timestamp"],
                        }
                    )

        return normalize_message(item)
    except Exception as exc:
        print(f"[DYNAMODB SAVE ERROR] {exc}")
        return None


def get_chat_history(conversation_id: str) -> list[dict]:
    try:
        ensure_table_exists()
        dynamodb = get_dynamodb_resource()
        table = dynamodb.Table(settings.DYNAMODB_TABLE_NAME)
        response = table.query(
            KeyConditionExpression=Key("ConversationID").eq(conversation_id),
            ScanIndexForward=True,
        )
        items = response.get("Items", [])
        return [normalize_message(item) for item in items]
    except Exception as exc:
        print(f"[DYNAMODB FETCH ERROR] {exc}")
        return []


def clear_chat_history(conversation_id: str) -> int:
    try:
        ensure_table_exists()
        dynamodb = get_dynamodb_resource()
        table = dynamodb.Table(settings.DYNAMODB_TABLE_NAME)
        response = table.query(
            KeyConditionExpression=Key("ConversationID").eq(conversation_id),
            ScanIndexForward=True,
        )
        items = response.get("Items", [])

        with table.batch_writer() as batch:
            for item in items:
                batch.delete_item(
                    Key={
                        "ConversationID": item["ConversationID"],
                        "Timestamp": item["Timestamp"],
                    }
                )

        return len(items)
    except Exception as exc:
        print(f"[DYNAMODB CLEAR ERROR] {exc}")
        return 0
