<<<<<<< HEAD
# **App Name**: Araç Ruhsat Tarayıcı

## Core Features:

- OCR Tarama: Ruhsat ve etiketin OCR ile taranması ve üzerindeki verilerin okunması. LLM tool used to parse the image into text.
- Veri Aktarımı ve Gösterim: Taranan verilerin eşleşen alanlara aktarılması ve kullanıcıya gösterilmesi.
- Veri Karşılaştırma ve Sonuç: 1. sayfadaki veriler ile 2. sayfadaki verilerin karşılaştırılması ve uygun/uygun değil sonucunun belirlenmesi.

## Style Guidelines:

- Ana renk: Açık mavi (#E3F2FD) veya açık yeşil (#E8F5E9) tonları, güven ve doğruluk hissi vermek için.
- İkincil renkler: Gri tonları (#F5F5F5, #E0E0E0) arkaplan ve ayrıştırıcı öğeler için.
- Vurgu rengi: Turuncu (#FF9800) veya amber (#FFC107), önemli butonlar ve uyarılar için.
- Temiz ve düzenli bir layout. Bilgilerin kolayca okunabilir ve anlaşılabilir olması için geniş aralıklar ve uygun hizalamalar kullanılmalı.
- Anlaşılır ve evrensel ikonlar kullanılmalı. Örneğin, tarama için kamera ikonu, onay için tik işareti, hata için ünlem işareti.
- Veri yükleme ve sonuç gösterme gibi işlemlerde hafif animasyonlar kullanılmalı. Bu, kullanıcının uygulamanın çalıştığını anlamasına yardımcı olur.
=======
# **App Name**: ArşivAsistanı

## Core Features:

- Branch Selection: Implement a branch selection screen, allowing users to select from multiple branches.
- New/Existing Record Choice: Design a screen to present users with the option to create a new record or access an existing one.
- Document Capture & OCR: Enable users to upload vehicle registration documents via camera, gallery, or device upload. Implement OCR to automatically extract information such as chassis number, brand, type, trade name, and owner into corresponding fields. Implement a tool to decide whether the information extracted by OCR should override fields in subsequent forms.
- Archived Records Management: Develop a search and display function for archived documents, categorized monthly, with a file naming convention of 'branch name/chassis number'. Enable folder viewing and basic editing.

## Style Guidelines:

- Primary color: Dark blue (#1A237E) for a professional and trustworthy feel.
- Secondary color: Light gray (#F5F5F5) for backgrounds to ensure readability.
- Accent color: Teal (#009688) to highlight important actions and elements.
- Use a clear, tabbed interface to separate different sections of the app (e.g., Branch Selection, New Record, Existing Records).
- Employ universally recognizable icons for actions like 'Upload,' 'Save,' 'Edit,' and 'Search'.
- Use subtle transitions and animations to guide the user through the workflow (e.g., when switching between tabs or when data is loading).

## Original User Request:
Uygulamamız, belgeleri kamera ile tarayarak metin çıkarma ve ilgili alanlara yerleştirme işlevleri sunan bir arşiv uygulaması olacak. Kullanıcılar galeri veya bilgisayardan dosya yükleyerek verileri kaydedebilecekler. Uygulamanın ilerleyen bölümlerinde kullanıcıların doldurması gereken formlar yer alacak. Son aşamada ise, tüm kayıtlar tek bir klasörde arşivlenecek. Bu özellikler, uygulamanızın işlevselliğini artırarak kullanıcıların belgelerini düzenli bir şekilde saklamalarına yardımcı olacaktır.
Veri, ilk sayfalarda kaydedildikten sonra, ilerleyen sayfalarda otomatik olarak çekilebilir. Bu, uygulamanızın kullanıcı deneyimini geliştirerek zaman tasarrufu sağlar ve verilerin tutarlılığını artırır. Kullanıcıların verdiği bilgilerin her sayfada eksiksiz ve güncel olmasını sağlamak, uygulamanın daha işlevsel hale gelmesine yardımcı olur. 

```
Sayfa 1: Şube Girişi: Birden fazla şube mevcut olacağından, ilk sayfada şube seçimi yapılacaktır.  
Sayfa 2: Yeni kayıt veya mevcut kayıt seçenekleri sunulacaktır.  
Sayfa 3: Yeni kayıt ekranı: Kullanıcı, kamera ile fotoğraf çekebilecek ya da galeriden veya cihazdan belge yükleyebilecektir. Bu belge, araç ruhsatı olacaktır. Ruhsat üzerindeki şase numarası, markası, tipi, ticari adı ve sahibi gibi bilgiler, ekrandaki ilgili alanlara OCR (Optik Karakter Tanıma) teknolojisi ile otomatik olarak yüklenecektir.  
Sayfa 4: Etiket bilgileri, OCR ile alınacaktır. Şase numarası, tip nay numarası, tip ve varyant bilgileri, ekrandaki alanlara otomatik olarak çekilecektir.  
Sayfa 5: Form eklenecektir.  
Eski kayıtlar sayfası: Yüklenen belgeler ve kaydedilen veriler, bu sayfada aylık kategoriler altında, dosya adı formatı "şube adı/şase numarası" şeklinde tek bir klasörde arşivlenecektir. Klasörler görüntülenebilecek ve düzenlenebilecektir.
```
  
>>>>>>> a9db2ca8afb83ba1351aa9e9178e522abe459450
