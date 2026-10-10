========================================
  Play game - Play Store Page
  (PHP Version - Works Everywhere)
========================================

LOCALHOST MEIN KAISE CHALAO (XAMPP):
--------------------------------------
1. XAMPP install karo: https://www.apachefriends.org
2. Saari files "htdocs/knight-game/" mein copy karo
3. XAMPP mein Apache Start karo
4. Browser mein kholo:
   User Page  →  http://localhost/knight-game/
   Admin Page →  http://localhost/knight-game/admin.html

NODE.JS SERVER SE CHALAO (bina PHP ke):
-----------------------------------------
1. Node.js install karo (v16+)
2. Files kisi bhi folder mein rakh do
3. Terminal mein: node server.js
4. Browser mein kholo:
   User Page  →  http://localhost:3000
   Admin Page →  http://localhost:3000/admin.html

INFINITY FREE (ya koi bhi PHP hosting) MEIN:
----------------------------------------------
1. InfinityFree pe account banao
2. File Manager ya FTP (FileZilla) se
   saari files /htdocs/ mein upload karo
3. Bus! Website live ho jayegi.

========================================
FILES KI LIST:
--------------
  index.html      ← User ka Play Store page
  admin.html      ← Admin panel
  api.php         ← Backend (PHP - InfinityFree/XAMPP)
  server.js       ← Backend (Node.js - localhost)
  .htaccess       ← Apache settings
  .user.ini       ← PHP upload limits
  data/           ← Auto banta hai (data.json)
  apk/            ← Local APK files yahan save hongi
  uploads/        ← Icon + screenshots

========================================
ADMIN PANEL SE KYA KAR SAKTE HO:
----------------------------------
  ✅ APK directly upload karo (file)
  ✅ APK external URL se set karo (Google Drive etc.)
  ✅ APK delete karo (file ya URL dono)
  ✅ App icon upload karo
  ✅ Screenshots upload/delete karo
  ✅ App info edit karo
  ✅ Reviews delete karo

========================================
APK KE 2 TARIKE:
-----------------

OPTION 1 — File Upload:
  Admin → "File Upload" tab → APK select karo → Upload

OPTION 2 — External URL (InfinityFree ke liye best):
  1. APK Google Drive pe upload karo
  2. File share karo "Anyone with link"
  3. Drive link copy karo:
     drive.google.com/file/d/FILE_ID/view
  4. Isko direct download link mein badlo:
     drive.google.com/uc?export=download&id=FILE_ID
  5. Admin → "APK by URL" tab → URL paste karo → Set

APK DELETE:
  Admin → "APK Management" card → "APK Delete Karo" button
  (sirf tab APK ya URL set ho)

========================================
ZARURI NOTE:
------------
* InfinityFree free plan mein file upload limit
  ~10MB hoti hai. Badi APK ke liye:
  - "APK by URL" feature use karo (Google Drive, Dropbox)
  - Ya paid hosting use karo (Hostinger cheap hai)

* data/ aur uploads/ folders mein write
  permission honi chahiye (chmod 755)
  Zyada tar hosting pe yeh default hota hai.

* APK download link (PHP):
  http://aapki-site.com/api.php?action=download_apk

* APK download link (Node.js):
  http://localhost:3000/api/download-apk
========================================
