# Raid Helper API Documentation

## Overview

Raid Helper is a Discord calendar bot that provides a comprehensive API for event management, user signups, DKP tracking, and attendance statistics. This documentation covers the key endpoints and integration patterns for Discord bot development.

**Base URL**: `https://raid-helper.dev/api/`

## Authentication

### Server Authorization
Server-level API operations require an API key that only users with admin or manage server permissions can access.

- **Get/Refresh API Key**: Use `/apikey` command in your Discord server
- **Header**: `Authorization: <server-api-key>`
- **Security**: Refresh immediately if compromised

### User Authorization
User-specific operations require a personal API key.

- **Get/Refresh API Key**: Use `/usersettings apikey` command
- **Usage**: API key is used directly in the URL path for user endpoints

## Core Server Endpoints

### Event Management

#### Get Single Event
```http
GET /v2/events/{EVENTID}
```
**Authorization**: None required
**Description**: Fetch full data of a single event (public endpoint)

**Response Fields**:
- `id` (string): Message ID of the event
- `serverId` (string): Server ID where event is posted
- `leaderId` (string): User ID of event leader
- `title` (string): Event title
- `description` (string): Event description
- `startTime` (number): Unix timestamp of event start
- `endTime` (number): Unix timestamp of event end
- `closingTime` (number): Unix timestamp when signups close
- `signUps` (array): Current signups for the event
- `classes` (array): Available classes for the event
- `roles` (array): Available roles for the event

#### Get Server Events
```http
GET /v3/servers/{SERVERID}/events
```
**Authorization**: Required
**Description**: Fetch all events on your server (max 1000 per page)

**Headers**:
- `Authorization: <server-api-key>`
- `Page: <number>` (optional): Page number for pagination
- `IncludeSignUps: <boolean>` (optional): Include signup data
- `ChannelFilter: <string>` (optional): Filter by channel ID
- `StartTimeFilter: <number>` (optional): Unix timestamp filter
- `EndTimeFilter: <number>` (optional): Unix timestamp filter

#### Create Event
```http
POST /v2/servers/{SERVERID}/channels/{CHANNELID}/event
```
**Authorization**: Required
**Content-Type**: `application/json; charset=utf-8`

**Required Fields**:
- `leaderId` (string): Discord ID of event leader
- `title` (string): Event title
- `description` (string): Event description
- `date` (string): Event date in server format or unix timestamp
- `time` (string): Event time or unix timestamp

**Optional Fields**:
- `templateId` (string): Template ID to apply
- `schedule` (number): Unix timestamp to schedule posting
- `advancedSettings` (object): Advanced event settings
- `classLimits` (object): Class-specific limits
- `roleLimits` (object): Role-specific limits

#### Update Event
```http
PATCH /v2/events/{EVENTID}
```
**Authorization**: Required
**Content-Type**: `application/json; charset=utf-8`

**Editable Fields**:
- `leaderId`, `leaderName`, `title`, `description`
- `date`, `time`, `startTime`, `endTime`
- `channelId`, `channelName`
- `advancedSettings`, `classes`, `roles`

#### Delete Event
```http
DELETE /v2/events/{EVENTID}
```
**Authorization**: Required

### Event Signups

#### Add Signup
```http
POST /v2/events/{EVENTID}/signups
```
**Authorization**: Required
**Content-Type**: `application/json; charset=utf-8`

**Required Fields**:
- `userId` (string): Discord ID of user
- `className` (string): Class name for signup
- `specName` (string): Spec name for signup

**Optional Fields**:
- `name` (string): Custom name (defaults to member name)
- `position` (number): Position in signup list
- `notify` (boolean): Whether to notify user
- `reason` (string): Reason for signup/notification
- `isFake` (boolean): Create fake user (doesn't require userId)

#### Edit Signup
```http
PATCH /v2/events/{EVENTID}/signups/{SIGNUPID}
```
**Authorization**: Required
**Content-Type**: `application/json; charset=utf-8`

Note: `SIGNUPID` can be the signup ID, position number, or username.

#### Delete Signup
```http
DELETE /v2/events/{EVENTID}/signups/{SIGNUPID}
```
**Authorization**: Required

### Scheduled Events
```http
GET /v3/servers/{SERVERID}/scheduledevents
```
**Authorization**: Required
**Description**: Fetch all scheduled and recurring events

## Advanced Features

### DKP (Dragon Kill Points) System

#### Get DKP Values
```http
GET /v2/servers/{SERVERID}/entities/{ENTITYID}/dkp
```
**Authorization**: Required

**Entity Types**:
- Discord User ID: Get individual user DKP
- Server ID: Get all users with DKP history
- Role ID: Get all users with specific role
- Event ID: Get all event signups (except Absent/Declined)

#### Manipulate DKP
```http
PATCH /v2/servers/{SERVERID}/entities/{ENTITYID}/dkp
```
**Authorization**: Required
**Content-Type**: `application/json; charset=utf-8`

**Required Fields**:
- `operation` (string): Operation type (add, subtract, multiply, divide, split, set)
- `value` (string): Value for calculation

**Optional Fields**:
- `description` (string): Description for log message

### Attendance Tracking
```http
GET /v2/servers/{SERVERID}/attendance
```
**Authorization**: Required

**Filter Options**:
- `TagFilter` (string): Filter by attendance tags
- `ChannelFilter` (string): Filter by channel IDs
- `TimeFilterStart` (number): Start time filter (unix timestamp)
- `TimeFilterEnd` (number): End time filter (unix timestamp)

**Notes**:
- Only closed events are included
- Excludes roles: Bench, Late, Tentative, Absence, Maybe, Declined

### Embed Messages
```http
POST /v2/servers/{SERVERID}/channels/{CHANNELID}/embed
```
**Authorization**: Required
**Content-Type**: `application/json; charset=utf-8`

**Available Fields**:
- `mentions` (string): Roles to ping (comma-separated)
- `title` (object): Embed title with optional URL
- `description` (string): Embed description
- `imageURL` (string): Image URL
- `thumbnailURL` (string): Thumbnail URL
- `color` (string): Hex color code
- `fields` (array): Embed fields
- `author` (object): Author section
- `footer` (object): Footer section

## User Endpoints

### Get User Events
```http
GET /v3/users/{USER_APIKEY}/events
```
**Description**: Fetch all events where the user is signed up
**Note**: Only returns the requesting user's signups in the signUps array

## Integration Best Practices

### Error Handling
- All endpoints return a `status` field indicating success/failure
- Check status before processing response data
- Implement retry logic for network failures

### Rate Limiting
- No specific rate limits mentioned in documentation
- Implement reasonable delays between requests
- Monitor for 429 responses and implement backoff

### Security
- Store API keys securely (environment variables)
- Never log or expose API keys in client-side code
- Refresh API keys immediately if compromised
- Use HTTPS for all requests

### Common Use Cases

#### 1. Event Creation Workflow
```javascript
// 1. Get server events to check for conflicts
GET /v3/servers/{serverId}/events

// 2. Create new event
POST /v2/servers/{serverId}/channels/{channelId}/event

// 3. Add signups programmatically
POST /v2/events/{eventId}/signups
```

#### 2. Attendance Reporting
```javascript
// 1. Get attendance statistics
GET /v2/servers/{serverId}/attendance

// 2. Filter by time period and channels
// Add headers: TimeFilterStart, TimeFilterEnd, ChannelFilter
```

#### 3. DKP Management
```javascript
// 1. Get current DKP for event participants
GET /v2/servers/{serverId}/entities/{eventId}/dkp

// 2. Award DKP to participants
PATCH /v2/servers/{serverId}/entities/{eventId}/dkp
// Body: { "operation": "add", "value": "50", "description": "Raid completion bonus" }
```

## Data Structures

### Event Object
Key fields returned in event responses:
- `id`: Message ID (used for most event operations)
- `serverId`: Server where event is posted
- `leaderId`/`leaderName`: Event leader info
- `channelId`/`channelName`: Channel info
- `startTime`/`endTime`/`closingTime`: Timestamps
- `signUps`: Array of signup objects
- `classes`/`roles`: Available options for signups

### Signup Object
- `userId`: Discord user ID
- `className`/`specName`: Class and spec selection
- `name`: Display name
- `position`: Order in signup list

### DKP Object
- `userId`: Discord user ID
- `dkp`: Current DKP value
- `name`: User display name

## Example Live Event
You can test the GET event endpoint with this example:
https://raid-helper.dev/api/v2/events/998707032230203474

This demonstrates the full event data structure and can be used for development testing.