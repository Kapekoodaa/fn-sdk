# OffsetsDumps — Unreal Engine Dumps Viewer

Updated and improved version of
https://github.com/offsetsdumps/offsetsdumps

Visit Site:
https://fn-sdk.netlify.app/

## Features

### URL Routing
Navigate directly to specific offsets using URL parameters:

- **Query Parameter**: `?offset=GWORLD`
- **Direct Parameter**: `?GWORLD`
- **Hash-based**: `#/offset/GWORLD` or `#/GWORLD`
- **Path-based**: `/offset/GWORLD` or `/GWORLD`

Example: `https://fn-sdk.netlify.app/?offset=GWORLD`

### API Endpoint for C++ Applications

Fetch offset values programmatically using the API endpoint:

**Endpoint**: `?api=offset&name=OFFSET_NAME`

**Response Format** (JSON):
```json
{
  "success": true,
  "name": "GWORLD",
  "value": 384473520,
  "hex": "0x16F0B230",
  "decimal": 384473520
}
```

**Usage Examples**:

1. **Browser/HTML**: `?api=offset&name=GWORLD`
2. **C++ (JSON format)**: `?api=offset&name=GWORLD&format=json`
3. **C++ (Raw)**: `?api=offset&name=GWORLD&raw=true`

**C++ Example**:
```cpp
#include <curl/curl.h>
#include <json/json.h>

std::string fetchOffset(const std::string& offsetName) {
    std::string url = "https://fn-sdk.netlify.app/?api=offset&name=" + offsetName + "&format=json";
    // Use your HTTP library to fetch the URL
    // Parse JSON response to get offset value
    return hexValue; // e.g., "0x16F0B230"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Offset \"INVALID\" not found"
}
```