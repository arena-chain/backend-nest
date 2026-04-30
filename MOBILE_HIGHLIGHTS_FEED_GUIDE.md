# Mobile Highlights Feed — Vertical Loop Watch Guide

This guide describes how to implement a **mobile highlights reel** (vertical swipe, one clip per screen) with a **continuous watch loop**, using your NestJS highlights API.

Backend references:

- `src/highlights/highlights.controller.ts`
- `src/highlights/schemas/highlight.schema.ts`

Base URL examples use `https://YOUR_API` — replace with your environment.

---

## 1) Data you get from the API

Each **highlight** document includes (see `highlight.schema.ts`):

| Field | Meaning |
|--------|--------|
| `_id` | Highlight id (use in URLs) |
| `title`, `description` | UI copy |
| `video` | Populated video ref (controller populates `title`, `url`, `thumbnailUrl`, `duration`) |
| `startTime`, `endTime` | Clip window in **seconds** (metadata; playback usually uses `clipUrl`) |
| `creator` | Populated creator |
| `clipUrl` | **URL or path** to the generated clip — this is what the mobile player should load |
| `visibility` | `public` \| `private` (feed should use public-only endpoints) |

**Feed-safe list:** only public highlights.

```http
GET /highlights/public
```

**Single highlight:**

```http
GET /highlights/:id
```

**Highlights for one video (optional filter):**

```http
GET /highlights/video/:videoId?publicOnly=true
```

**Engagement (optional JWT for `likedByMe`):**

```http
GET /highlights/:id/engagement
Authorization: Bearer <token>   # optional
```

**Comments:**

```http
GET /highlights/:id/comments
```

Authenticated actions (Bearer JWT):

- `POST /highlights/:id/like` / `DELETE /highlights/:id/like`
- `POST /highlights/:id/save` / `DELETE /highlights/:id/save`
- `POST /highlights/:id/comments` (body: `{ "body": "...", "parentCommentId"?: "..." }`)

---

## 2) Mobile screen: “Highlights reel”

### UX

- Full-screen **vertical** list; each row is one highlight.
- **Autoplay** the visible row’s `clipUrl`; pause when off-screen.
- Swipe up/down to change clip (TikTok / Reels style).
- Overlay: title, creator, like/comment counts (from engagement), optional save.

### “Loop to watch” — three patterns

Pick one (or combine A + C).

#### A) Infinite loop on the **same** list (repeat forever)

1. Fetch `GET /highlights/public` → array `items`.
2. If `items.length === 0`, show empty state.
3. Use a vertical `FlatList` / `PagerView` with `items`.
4. On **last item visible** (user swipes to end), **jump to index 0** without animation (or with a subtle fade) so watching continues in a loop.

Pseudo:

```text
onViewableItemsChanged: if index === items.length - 1 → after video ends OR on swipe end → scrollToOffset(0)
```

Better UX: when the **video fires `onEnd`**, if current index is last, seek to first item and play (avoids jarring mid-swipe jumps).

#### B) Circular index (modulo) with a **duplicated** buffer

Duplicate data `[...items, ...items]` in memory only for smooth looping on some list implementations, then reset scroll position when crossing the midpoint (classic carousel trick). Use if native snap causes flicker on `scrollToIndex(0)`.

#### C) “Loop” inside one player

For a **single** highlight, set the player to **repeat** (`loop` / `repeatMode`) so the same clip replays until the user swipes away. Combine with A for feed-level loop.

---

## 3) React Native sketch (FlatList + loop at end)

Dependencies: `expo-av` or `react-native-video` — use your stack’s HLS/MP4 support for `clipUrl`.

```tsx
import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  ViewToken,
  ActivityIndicator,
} from 'react-native';
import Video from 'react-native-video'; // or expo-av

const H = Dimensions.get('window').height;

type Highlight = {
  _id: string;
  title: string;
  clipUrl: string;
  description?: string;
  creator?: { username?: string; avatar?: string };
  video?: { thumbnailUrl?: string; title?: string };
};

const API = 'https://YOUR_API';

export function HighlightsReelScreen() {
  const [items, setItems] = useState<Highlight[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Highlight>>(null);

  React.useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/highlights/public`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    })();
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) setActiveIndex(viewableItems[0].index);
    },
  ).current;

  const onVideoEnd = useCallback(
    (index: number) => {
      if (items.length === 0) return;
      const next = (index + 1) % items.length;
      listRef.current?.scrollToIndex({ index: next, animated: true });
    },
    [items.length],
  );

  if (!items.length) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No highlights yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={(it) => it._id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={H}
      decelerationRate="fast"
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
      getItemLayout={(_, index) => ({ length: H, offset: H * index, index })}
      renderItem={({ item, index }) => (
        <View style={{ height: H, backgroundColor: '#000' }}>
          <Video
            source={{ uri: item.clipUrl.startsWith('http') ? item.clipUrl : `${API}/${item.clipUrl}` }}
            style={{ flex: 1 }}
            resizeMode="cover"
            repeat={items.length === 1}
            paused={index !== activeIndex}
            onEnd={() => onVideoEnd(index)}
          />
          <View style={{ position: 'absolute', bottom: 48, left: 16, right: 16 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{item.title}</Text>
            <Text style={{ color: '#ccc', marginTop: 4 }}>
              @{item.creator?.username ?? 'creator'}
            </Text>
          </View>
        </View>
      )}
    />
  );
}
```

Notes:

- If `clipUrl` is a **relative path**, prefix with your CDN or API static base (your deployment defines this).
- Resolve **full URL** in one place (`resolveClipUrl(h)`).
- For **last → first** loop, `onEnd` modulo above already moves to index `0` after the last clip; alternatively call `listRef.current?.scrollToIndex({ index: 0 })` when `index === items.length - 1`.

---

## 4) Engagement + comments on scroll

When `activeIndex` changes, fetch engagement for the visible id (debounce ~200 ms to avoid spam):

```http
GET /highlights/{id}/engagement
```

Optional: prefetch `id` at `activeIndex + 1` for smoother UI.

Comments sheet when user taps comment icon:

```http
GET /highlights/{id}/comments
```

---

## 5) Auth headers

- **Public feed:** no token for `GET /highlights/public`.
- **Likes / save / post comment:** `Authorization: Bearer <access_token>`.
- **Engagement “did I like?”:** send same optional token as your backend `OptionalJwtAuthGuard` expects.

---

## 6) Performance checklist

- [ ] Only the **visible** row plays video; others **paused**.
- [ ] Preload next `clipUrl` if the player supports it.
- [ ] Debounce engagement API when swiping fast.
- [ ] Handle `clipUrl` as absolute vs relative consistently.
- [ ] `FlatList` `windowSize` small (e.g. 3) to limit decoders.
- [ ] On background app, **pause** all players.

---

## 7) Implementation checklist

- [ ] Screen: vertical full-screen list
- [ ] Fetch `GET /highlights/public`
- [ ] Play `clipUrl` for active index; pause others
- [ ] Loop: auto-advance on `onEnd` with modulo **or** jump to first item after last
- [ ] Optional: `repeat` when only one highlight exists
- [ ] Overlay UI + `GET .../engagement` for counts / liked state
- [ ] Comments bottom sheet + `GET/POST` comments
- [ ] Like / save wired to JWT when user is logged in

---

## 8) Related docs in repo

- `REELS_FRONTEND_GUIDE.md` — overlaps with reels-style vertical video UX; use alongside this guide for UI patterns.
