import React, { useEffect, useState } from 'react'
import { Tooltip } from 'react-tooltip'
import { useGetterContext } from '../Store'


export const Logos = ({ logo, href, onclick }) => {
    const initialState = {
        colors: 'logo',
        fonts: 'logo',
        images: 'logo',
        info: 'logo',
        settings: 'logo'
    }
    const { setPropName, propName } = useGetterContext()
    const [className, setClassName] = useState(initialState);
    const toolTipPlace = 'top'

    useEffect(() => {
        switch (propName) {
            case 'colors':
                setClassName(({
                    ...initialState,
                    colors: 'logo active',
                }));
                break;
            case 'fonts':
                setClassName({
                    ...initialState,
                    fonts: 'logo active',
                });
                break;
            case 'images':
                setClassName({
                    ...initialState,
                    images: 'logo active',
                });
                break;
            case 'info':
                setClassName({
                    ...initialState,
                    info: 'logo active',
                });
                break;
            case 'settings':
                setClassName({
                    ...initialState,
                    settings: 'logo active',
                });
                break;
        }
    }, [propName])

    const handleLogoClick = (e) => setPropName(e.target.id)

    const header = (
        <svg width="154" height="50" viewBox="0 0 154 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g filter="url(#filter0_d_14_93)">
                <path d="M32.2226 2H37.6795C38.521 2 39.3302 2.13427 40.1054 2.40461C40.8806 2.67496 41.5627 3.1118 42.1518 3.71872C42.7408 4.32564 43.2045 5.0919 43.5411 6.0175C43.8776 6.9449 44.0459 8.06385 44.0459 9.37796V18.07C44.0459 18.8452 44.2644 19.4683 44.703 19.9391C45.1398 20.4118 45.6537 20.7645 46.2445 21.0008C46.8335 21.2371 47.4315 21.3893 48.0384 21.4555C48.6453 21.5236 49.1323 21.5558 49.5047 21.5558V27.3171C49.1341 27.3171 48.6453 27.3511 48.0384 27.4173C47.4315 27.4854 46.8335 27.6376 46.2445 27.8721C45.6554 28.1084 45.1398 28.4611 44.703 28.9338C44.2644 29.4064 44.0459 30.0294 44.0459 30.8029V39.5451C44.0459 40.8592 43.8776 41.9781 43.5411 42.9055C43.2045 43.8311 42.7497 44.5902 42.1768 45.1792C41.6039 45.7682 40.9218 46.1979 40.1305 46.4683C39.3392 46.7368 38.4708 46.8729 37.5273 46.8729H32.2208V41.1116H34.6968C35.472 41.1116 36.0772 41.0113 36.5158 40.809C36.9526 40.6067 37.2821 40.3453 37.5005 40.0267C37.7189 39.7062 37.855 39.3517 37.9051 38.965C37.9552 38.5783 37.9803 38.2148 37.9803 37.8783V29.743C37.9803 28.5649 38.1486 27.6376 38.4852 26.9644C38.8217 26.2912 39.2353 25.7774 39.7241 25.4229C40.2128 25.0684 40.7517 24.8411 41.3407 24.7408C41.9298 24.6405 42.4937 24.5564 43.0344 24.4884V24.3881C42.4955 24.3541 41.9298 24.2878 41.3407 24.1858C40.7517 24.0855 40.211 23.8582 39.7241 23.5037C39.2353 23.1492 38.8217 22.6372 38.4852 21.9622C38.1486 21.289 37.9803 20.3634 37.9803 19.1836V10.9982C37.9803 10.6616 37.9552 10.3 37.9051 9.91148C37.855 9.52477 37.7189 9.17028 37.5005 8.84981C37.2803 8.52934 36.9526 8.26795 36.5158 8.06744C36.0772 7.86513 35.472 7.76487 34.6968 7.76487H32.2208V2H32.2226Z" fill="white" />
                <path d="M18.9795 41.2387H16.806C16.0308 41.2387 15.4239 41.1384 14.9871 40.9361C14.5484 40.7338 14.2208 40.4724 14.0024 40.1538C13.7822 39.8333 13.6479 39.4788 13.5978 39.0921C13.5476 38.7054 13.5226 38.3419 13.5226 38.0054V29.82C13.5226 28.6419 13.3543 27.7145 13.0177 27.0414C12.6811 26.3682 12.2676 25.8544 11.7788 25.4999C11.29 25.1454 10.7511 24.918 10.1621 24.8178C9.5731 24.7175 9.00736 24.6495 8.46847 24.6155V24.5152C9.00736 24.4812 9.57131 24.406 10.1621 24.2878C10.7511 24.1697 11.29 23.9333 11.7788 23.5807C12.2676 23.2262 12.6793 22.7141 13.0177 22.0392C13.3543 21.366 13.5226 20.4404 13.5226 19.2606V11.1253C13.5226 10.7887 13.5476 10.4271 13.5978 10.0386C13.6479 9.65187 13.7822 9.29738 14.0024 8.97692C14.2208 8.65645 14.5502 8.39506 14.9871 8.19454C15.4239 7.99223 16.0308 7.89197 16.806 7.89197H19.2821V2.12711H13.9755C13.032 2.12711 12.1637 2.26138 11.3724 2.53172C10.5811 2.80206 9.88999 3.23174 9.30097 3.82076C8.71195 4.40978 8.25721 5.16888 7.93674 6.09448C7.61627 7.02187 7.45693 8.14083 7.45693 9.45493V18.1971C7.45693 18.9723 7.22956 19.5954 6.77482 20.0662C6.32007 20.5389 5.79013 20.8916 5.18321 21.1279C4.57629 21.3642 3.97116 21.5164 3.36423 21.5826C2.75731 21.6507 2.30257 21.6829 2 21.6829V27.4442C2.30257 27.4442 2.75731 27.4782 3.36423 27.5444C3.97116 27.6125 4.57629 27.7647 5.18321 27.9992C5.79013 28.2355 6.32007 28.5882 6.77482 29.0609C7.22956 29.5335 7.45693 30.1565 7.45693 30.93V39.622C7.45693 40.9361 7.62522 42.0551 7.96181 42.9825C8.29839 43.9081 8.76208 44.6761 9.3511 45.2813C9.94012 45.8882 10.6312 46.325 11.4225 46.5954C12.2138 46.8639 13.0643 47 13.9737 47H24.4937L29.435 31.5172H21.5289L18.9777 41.2405L18.9795 41.2387ZM30.4394 17.0638C30.1834 16.4426 29.8253 15.9019 29.3688 15.4436C28.9105 14.9871 28.3716 14.629 27.7486 14.373C27.1255 14.117 26.4667 13.9881 25.772 13.9881C25.0774 13.9881 24.4167 14.117 23.7955 14.373C23.1725 14.629 22.6336 14.9871 22.1753 15.4436C21.7169 15.9019 21.3606 16.4408 21.1046 17.0638C20.8486 17.6869 20.7197 18.3457 20.7197 19.0404C20.7197 19.735 20.8468 20.3957 21.1046 21.0169C21.3606 21.6399 21.7169 22.1788 22.1753 22.6371C22.6318 23.0955 23.1725 23.4517 23.7955 23.7078C24.4167 23.9638 25.0756 24.0927 25.772 24.0927C26.4685 24.0927 27.1255 23.9656 27.7486 23.7078C28.3698 23.4517 28.9105 23.0955 29.3688 22.6371C29.8253 22.1806 30.1834 21.6399 30.4394 21.0169C30.6954 20.3957 30.8243 19.7368 30.8243 19.0404C30.8243 18.3439 30.6954 17.6869 30.4394 17.0638Z" fill="white" />
            </g>
            <g filter="url(#filter1_d_14_93)">
                <path d="M78.3953 39.0348C77.108 39.7062 75.7653 40.1914 74.367 40.4886C72.9688 40.7876 71.5419 40.9362 70.0881 40.9362C68.5395 40.9362 67.1144 40.6945 65.8092 40.2093C64.5041 39.7241 63.3762 39.0295 62.4255 38.1253C61.4748 37.2212 60.7336 36.1255 60.2019 34.8383C59.6702 33.551 59.4052 32.1152 59.4052 30.5307C59.4052 28.9463 59.6702 27.5105 60.2019 26.2232C60.7336 24.936 61.4748 23.8421 62.4255 22.9362C63.3762 22.032 64.5041 21.3374 65.8092 20.8522C67.1144 20.367 68.5413 20.1253 70.0881 20.1253C71.635 20.1253 73.1317 20.3169 74.4655 20.6982C75.7993 21.0814 76.9684 21.7384 77.9763 22.6694L74.8988 26.0263C74.3026 25.4104 73.6312 24.9449 72.8846 24.628C72.1381 24.3111 71.2071 24.1518 70.0881 24.1518C69.1554 24.1518 68.3121 24.3111 67.5566 24.628C66.8011 24.9449 66.153 25.3889 65.6123 25.9564C65.0716 26.5258 64.6563 27.2007 64.368 27.9849C64.078 28.7673 63.9348 29.6177 63.9348 30.5307C63.9348 31.4438 64.0798 32.3157 64.368 33.0909C64.6563 33.8643 65.0716 34.5357 65.6123 35.105C66.153 35.6744 66.8011 36.1166 67.5566 36.4335C68.3121 36.7504 69.1554 36.9097 70.0881 36.9097C71.0209 36.9097 71.8588 36.8023 72.5498 36.5874C73.2391 36.3726 73.7905 36.1542 74.2005 35.9304V32.7132H70.6485V28.6849H78.3971V39.0348H78.3953Z" fill="white" />
                <path d="M94.8932 37.6885C94.1234 38.6732 93.1494 39.4323 91.9732 39.9658C90.7969 40.4993 89.5777 40.7679 88.3155 40.7679C87.0533 40.7679 85.9899 40.5745 84.93 40.1896C83.8701 39.8047 82.9517 39.2533 82.1711 38.5371C81.3905 37.821 80.7746 36.9598 80.3271 35.9537C79.8777 34.9493 79.6539 33.825 79.6539 32.5843C79.6539 31.3436 79.8777 30.221 80.3271 29.2149C80.7764 28.2105 81.3905 27.3493 82.1711 26.6314C82.9517 25.9153 83.8719 25.3639 84.93 24.9789C85.9881 24.594 87.116 24.4007 88.3155 24.4007C89.4273 24.4007 90.4389 24.594 91.3484 24.9789C92.2578 25.3639 93.0277 25.9153 93.6579 26.6314C94.2881 27.3476 94.7751 28.2087 95.117 29.2149C95.459 30.221 95.6308 31.3436 95.6308 32.5843V34.0917H84.4663C84.6597 35.012 85.075 35.7442 85.7178 36.2903C86.3605 36.8363 87.15 37.1084 88.0917 37.1084C88.8831 37.1084 89.5509 36.9312 90.0969 36.5785C90.643 36.2258 91.1174 35.7711 91.5238 35.2143L94.8932 37.6849V37.6885ZM90.8184 30.8226C90.8399 30.0098 90.5731 29.3151 90.0163 28.7368C89.4596 28.1586 88.7434 27.8703 87.8662 27.8703C87.3308 27.8703 86.86 27.9563 86.4536 28.1263C86.0472 28.2982 85.6999 28.5166 85.4116 28.7834C85.1234 29.0519 84.8978 29.3617 84.7384 29.7144C84.5773 30.0671 84.486 30.4359 84.4663 30.8208H90.8184V30.8226Z" fill="white" />
                <path d="M108.369 28.6402H104.133V33.8375C104.133 34.2654 104.155 34.6557 104.198 35.0084C104.24 35.3611 104.337 35.6654 104.486 35.9232C104.634 36.1792 104.865 36.378 105.175 36.5176C105.485 36.6573 105.897 36.7253 106.41 36.7253C106.666 36.7253 107.005 36.6984 107.422 36.6447C107.839 36.591 108.154 36.4675 108.369 36.2759V40.2863C107.834 40.4796 107.279 40.6067 106.7 40.6712C106.122 40.7356 105.556 40.7679 105 40.7679C104.187 40.7679 103.438 40.6819 102.755 40.5118C102.069 40.3418 101.471 40.0678 100.957 39.6937C100.443 39.3195 100.042 38.8325 99.7539 38.2345C99.4657 37.6366 99.3206 36.9079 99.3206 36.0521V28.6402H96.2413V24.7892H99.3206V20.1683H104.133V24.7892H108.369V28.6402Z" fill="white" />
                <path d="M121.583 28.6402H117.348V33.8375C117.348 34.2654 117.369 34.6557 117.412 35.0084C117.455 35.3611 117.552 35.6654 117.7 35.9232C117.849 36.1792 118.08 36.378 118.39 36.5176C118.699 36.6573 119.111 36.7253 119.625 36.7253C119.881 36.7253 120.219 36.6984 120.636 36.6447C121.054 36.591 121.369 36.4675 121.583 36.2759V40.2863C121.048 40.4796 120.493 40.6067 119.915 40.6712C119.337 40.7356 118.771 40.7679 118.214 40.7679C117.401 40.7679 116.653 40.6819 115.969 40.5118C115.283 40.3418 114.685 40.0678 114.171 39.6937C113.658 39.3195 113.257 38.8325 112.968 38.2345C112.68 37.6366 112.535 36.9079 112.535 36.0521V28.6402H109.456V24.7892H112.535V20.1683H117.348V24.7892H121.583V28.6402Z" fill="white" />
                <path d="M137.498 37.6885C136.728 38.6732 135.754 39.4323 134.578 39.9658C133.401 40.4993 132.182 40.7679 130.92 40.7679C129.658 40.7679 128.594 40.5745 127.535 40.1896C126.476 39.8047 125.556 39.2533 124.776 38.5371C123.995 37.821 123.379 36.9598 122.932 35.9537C122.482 34.9493 122.258 33.825 122.258 32.5843C122.258 31.3436 122.482 30.221 122.932 29.2149C123.381 28.2105 123.995 27.3493 124.776 26.6314C125.556 25.9153 126.476 25.3639 127.535 24.9789C128.593 24.594 129.721 24.4007 130.92 24.4007C132.032 24.4007 133.043 24.594 133.953 24.9789C134.862 25.3639 135.632 25.9153 136.262 26.6314C136.893 27.3476 137.38 28.2087 137.722 29.2149C138.063 30.221 138.235 31.3436 138.235 32.5843V34.0917H127.071C127.264 35.012 127.68 35.7442 128.322 36.2903C128.965 36.8363 129.755 37.1084 130.696 37.1084C131.488 37.1084 132.155 36.9312 132.701 36.5785C133.247 36.2258 133.722 35.7711 134.128 35.2143L137.498 37.6849V37.6885ZM133.423 30.8226C133.444 30.0098 133.178 29.3151 132.621 28.7368C132.064 28.1586 131.348 27.8703 130.471 27.8703C129.935 27.8703 129.465 27.9563 129.058 28.1263C128.652 28.2982 128.304 28.5166 128.016 28.7834C127.728 29.0519 127.502 29.3617 127.343 29.7144C127.182 30.0671 127.091 30.4359 127.071 30.8208H133.423V30.8226Z" fill="white" />
                <path d="M139.551 24.7909H144.364V27.2938H144.428C144.942 26.3306 145.551 25.6091 146.256 25.1275C146.961 24.6459 147.849 24.406 148.918 24.406C149.196 24.406 149.475 24.4167 149.753 24.4382C150.03 24.4597 150.286 24.5027 150.522 24.5671V28.9624C150.18 28.855 149.844 28.7762 149.513 28.7225C149.181 28.6688 148.834 28.6419 148.471 28.6419C147.55 28.6419 146.824 28.7708 146.288 29.0269C145.753 29.2829 145.341 29.6427 145.053 30.1011C144.765 30.5612 144.577 31.1126 144.491 31.7535C144.405 32.3945 144.362 33.1017 144.362 33.8715V40.3847H139.549V24.7927L139.551 24.7909Z" fill="white" />
            </g>
            <g filter="url(#filter2_d_14_93)">
                <path d="M67.3703 15.5314C66.9568 16.09 66.4788 16.491 65.9381 16.7345C65.3956 16.978 64.8084 17.098 64.1764 17.098C63.5444 17.098 62.9196 16.987 62.3735 16.7632C61.8275 16.5412 61.3602 16.2297 60.9717 15.8286C60.5832 15.4276 60.2788 14.9496 60.0604 14.3964C59.842 13.8414 59.7328 13.2362 59.7328 12.581C59.7328 11.9257 59.842 11.3224 60.0604 10.7709C60.2788 10.2213 60.5832 9.74508 60.9717 9.34404C61.3602 8.94301 61.8275 8.6297 62.3735 8.40233C62.9196 8.17495 63.5211 8.06216 64.1764 8.06216C64.76 8.06216 65.3043 8.166 65.8092 8.37189C66.3158 8.57778 66.758 8.9251 67.1394 9.41028L66.4841 9.95634C66.2174 9.55172 65.8754 9.25632 65.4583 9.07012C65.0411 8.88393 64.615 8.79083 64.1764 8.79083C63.6178 8.79083 63.1129 8.88751 62.6636 9.08265C62.2142 9.2778 61.8311 9.54456 61.516 9.88472C61.2009 10.2249 60.9574 10.6259 60.7873 11.0878C60.6172 11.5497 60.5331 12.0474 60.5331 12.581C60.5331 13.1145 60.6172 13.614 60.7873 14.0741C60.9574 14.536 61.2009 14.937 61.516 15.2772C61.8311 15.6174 62.2142 15.8841 62.6636 16.0793C63.1129 16.2744 63.6178 16.3711 64.1764 16.3711C64.3948 16.3711 64.6222 16.3442 64.8567 16.2923C65.0912 16.2404 65.3204 16.158 65.5424 16.0488C65.7644 15.9396 65.9775 15.8018 66.1798 15.6353C66.3821 15.4688 66.5593 15.2682 66.7133 15.0337L67.3686 15.5314H67.3703Z" fill="white" />
                <path d="M68.9781 15.2879C69.1893 15.6513 69.4615 15.9235 69.7981 16.1007C70.1346 16.2797 70.516 16.3675 70.9457 16.3675C71.2124 16.3675 71.4631 16.3263 71.6994 16.2457C71.9339 16.1652 72.138 16.0506 72.3117 15.9056C72.4853 15.7605 72.6232 15.5833 72.7253 15.3774C72.8273 15.1715 72.8774 14.9388 72.8774 14.6792C72.8774 14.3802 72.8148 14.1331 72.6894 13.938C72.5641 13.7428 72.3958 13.5835 72.1864 13.4582C71.9751 13.3329 71.7388 13.2254 71.4756 13.1359C71.2124 13.0464 70.9421 12.9587 70.6628 12.8692C70.3835 12.7796 70.1114 12.6794 69.85 12.5648C69.5868 12.452 69.3505 12.3034 69.1392 12.1208C68.928 11.9382 68.7615 11.7108 68.6361 11.4351C68.5108 11.1594 68.4481 10.8192 68.4481 10.4146C68.4481 10.0333 68.5233 9.69669 68.6719 9.40128C68.8223 9.10588 69.0246 8.85881 69.2789 8.66008C69.5331 8.46136 69.8267 8.31276 70.1597 8.21071C70.4909 8.11045 70.84 8.05853 71.2035 8.05853C71.6725 8.05853 72.1076 8.14089 72.5086 8.30739C72.9097 8.47389 73.2552 8.75139 73.547 9.13989L72.8542 9.63761C72.6518 9.35473 72.4155 9.14168 72.1434 9.00025C71.8713 8.85881 71.5508 8.7872 71.1784 8.7872C70.9188 8.7872 70.6717 8.82121 70.4372 8.89104C70.2027 8.95907 69.9986 9.06112 69.8249 9.19539C69.6513 9.32967 69.5116 9.49796 69.406 9.69848C69.3003 9.90078 69.2484 10.1407 69.2484 10.4146C69.2484 10.8443 69.3576 11.1737 69.5761 11.4047C69.7945 11.6356 70.0684 11.8182 70.396 11.9507C70.7237 12.085 71.0799 12.2014 71.4649 12.3034C71.8498 12.4055 72.2061 12.5397 72.5337 12.7098C72.8613 12.8799 73.1352 13.1162 73.3537 13.4206C73.5721 13.7249 73.6813 14.1439 73.6813 14.6774C73.6813 15.0659 73.6079 15.4096 73.4629 15.7104C73.3179 16.0094 73.1209 16.2636 72.8738 16.4695C72.6268 16.6754 72.3421 16.8312 72.0181 16.9368C71.694 17.0424 71.3574 17.0943 71.0101 17.0943C70.4426 17.0943 69.9216 16.9959 69.4436 16.7971C68.9656 16.5984 68.5574 16.2654 68.2172 15.7946L68.9817 15.2843L68.9781 15.2879Z" fill="white" />
                <path d="M75.3696 15.2879C75.5808 15.6513 75.853 15.9235 76.1895 16.1007C76.5261 16.2797 76.9075 16.3675 77.3371 16.3675C77.6039 16.3675 77.8545 16.3263 78.0909 16.2457C78.3254 16.1652 78.5295 16.0506 78.7032 15.9056C78.8768 15.7605 79.0147 15.5833 79.1167 15.3774C79.2188 15.1715 79.2689 14.9388 79.2689 14.6792C79.2689 14.3802 79.2062 14.1331 79.0809 13.938C78.9556 13.7428 78.7873 13.5835 78.5778 13.4582C78.3666 13.3329 78.1303 13.2254 77.8671 13.1359C77.6039 13.0464 77.3336 12.9587 77.0543 12.8692C76.775 12.7796 76.5028 12.6794 76.2415 12.5648C75.9783 12.452 75.742 12.3034 75.5307 12.1208C75.3194 11.9382 75.1529 11.7108 75.0276 11.4351C74.9023 11.1594 74.8396 10.8192 74.8396 10.4146C74.8396 10.0333 74.9148 9.69669 75.0634 9.40128C75.2138 9.10588 75.4161 8.85881 75.6703 8.66008C75.9246 8.46136 76.2182 8.31276 76.5512 8.21071C76.8824 8.11045 77.2315 8.05853 77.5949 8.05853C78.064 8.05853 78.4991 8.14089 78.9001 8.30739C79.3011 8.47389 79.6467 8.75139 79.9385 9.13989L79.2456 9.63761C79.0433 9.35473 78.807 9.14168 78.5349 9.00025C78.2627 8.85881 77.9423 8.7872 77.5699 8.7872C77.3103 8.7872 77.0632 8.82121 76.8287 8.89104C76.5942 8.95907 76.3901 9.06112 76.2164 9.19539C76.0427 9.32967 75.9031 9.49796 75.7975 9.69848C75.6918 9.90078 75.6399 10.1407 75.6399 10.4146C75.6399 10.8443 75.7491 11.1737 75.9675 11.4047C76.186 11.6356 76.4599 11.8182 76.7875 11.9507C77.1151 12.085 77.4714 12.2014 77.8563 12.3034C78.2413 12.4055 78.5975 12.5397 78.9252 12.7098C79.2528 12.8799 79.5267 13.1162 79.7451 13.4206C79.9636 13.7249 80.0728 14.1439 80.0728 14.6774C80.0728 15.0659 79.9994 15.4096 79.8543 15.7104C79.7093 16.0094 79.5124 16.2636 79.2653 16.4695C79.0183 16.6754 78.7336 16.8312 78.4096 16.9368C78.0855 17.0424 77.7489 17.0943 77.4016 17.0943C76.8341 17.0943 76.3131 16.9959 75.8351 16.7971C75.357 16.5984 74.9488 16.2654 74.6087 15.7946L75.3731 15.2843L75.3696 15.2879Z" fill="white" />
            </g>
            <defs>
                <filter id="filter0_d_14_93" x="0.423378" y="0.423378" width="52.0912" height="49.5865" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dx="0.716646" dy="0.716646" />
                    <feGaussianBlur stdDeviation="1.14663" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_14_93" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_14_93" result="shape" />
                </filter>
                <filter id="filter1_d_14_93" x="58.2985" y="19.0186" width="95.5439" height="25.2376" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dx="1.10669" dy="1.10669" />
                    <feGaussianBlur stdDeviation="1.10669" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_14_93" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_14_93" result="shape" />
                </filter>
                <filter id="filter2_d_14_93" x="58.7436" y="7.06933" width="23.7329" height="12.4323" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dx="0.707248" dy="0.707248" />
                    <feGaussianBlur stdDeviation="0.848227" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_14_93" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_14_93" result="shape" />
                </filter>
            </defs>
        </svg>
    )

    const link = (
        <a href={href} target="_blank" className='link-logo'>
            <svg id='link' xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="transparent">
                <path d="M7 2.5H2.5C2.10218 2.5 1.72064 2.65804 1.43934 2.93934C1.15804 3.22064 1 3.60218 1 4V11.5C1 11.8978 1.15804 12.2794 1.43934 12.5607C1.72064 12.842 2.10218 13 2.5 13H10C10.3978 13 10.7794 12.842 11.0607 12.5607C11.342 12.2794 11.5 11.8978 11.5 11.5V7M6.25 7.75L13 1M13 1H9.25M13 1V4.75" stroke="#CD186D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                    <linearGradient id="logo-gradient" x1="1" y1="7" x2="13" y2="7" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#912381" />
                        <stop offset="0.33" stopColor="#CD186D" />
                        <stop offset="0.66" stopColor="#EA2634" />
                        <stop offset="1" stopColor="#F95535" />
                    </linearGradient>
                </defs>
            </svg>
        </a>
    )

    const download = (
        <button className='download-button' onClick={onclick}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 13.3333L5.83337 9.16668L7.00004 7.95834L9.16671 10.125V3.33334H10.8334V10.125L13 
                7.95834L14.1667 9.16668L10 13.3333ZM5.00004 16.6667C4.54171 16.6667 4.14948 16.5036 3.82337 16.1775C3.49726 
                15.8514 3.33393 15.4589 3.33337 15V12.5H5.00004V15H15V12.5H16.6667V15C16.6667 15.4583 16.5037 15.8508 16.1775 
                16.1775C15.8514 16.5042 15.4589 16.6672 15 16.6667H5.00004Z" fill="#F7F7F7" />
            </svg>
            <div>DOWNLOAD ALL</div>
        </button>
    )

    const download_icon = (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 13.3333L5.83337 9.16668L7.00004 7.95834L9.16671 10.125V3.33334H10.8334V10.125L13 
                7.95834L14.1667 9.16668L10 13.3333ZM5.00004 16.6667C4.54171 16.6667 4.14948 16.5036 3.82337 16.1775C3.49726 
                15.8514 3.33393 15.4589 3.33337 15V12.5H5.00004V15H15V12.5H16.6667V15C16.6667 15.4583 16.5037 15.8508 16.1775 
                16.1775C15.8514 16.5042 15.4589 16.6672 15 16.6667H5.00004Z" fill="#F7F7F7" />
        </svg>
    )

    const colors = (
        <button className={className.colors} id='colors' style={{ border: 'none' }} data-tooltip-content={`${logo}`.toUpperCase()}
             data-tooltip-id="logo-tooltip" name='backgroundColor' onClick={handleLogoClick}>
            <svg id='colors' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path id='colors' d="M19.3333 12C18.8029 12 18.2942 11.7893 17.9191 11.4142C17.544 11.0391 17.3333 10.5304 17.3333 10C17.3333 9.46957 17.544 8.96086 17.9191 8.58579C18.2942 8.21071 18.8029 8 19.3333 8C19.8638 8 20.3725 8.21071 20.7475 8.58579C21.1226 8.96086 21.3333 9.46957 21.3333 10C21.3333 10.5304 21.1226 11.0391 20.7475 11.4142C20.3725 11.7893 19.8638 12 19.3333 12ZM15.3333 6.66667C14.8029 6.66667 14.2942 6.45595 13.9191 6.08088C13.544 5.70581 13.3333 5.1971 13.3333 4.66667C13.3333 4.13623 13.544 3.62753 13.9191 3.25245C14.2942 2.87738 14.8029 2.66667 15.3333 2.66667C15.8638 2.66667 16.3725 2.87738 16.7475 3.25245C17.1226 3.62753 17.3333 4.13623 17.3333 4.66667C17.3333 5.1971 17.1226 5.70581 16.7475 6.08088C16.3725 6.45595 15.8638 6.66667 15.3333 6.66667ZM8.66667 6.66667C8.13623 6.66667 7.62753 6.45595 7.25245 6.08088C6.87738 5.70581 6.66667 5.1971 6.66667 4.66667C6.66667 4.13623 6.87738 3.62753 7.25245 3.25245C7.62753 2.87738 8.13623 2.66667 8.66667 2.66667C9.1971 2.66667 9.70581 2.87738 10.0809 3.25245C10.456 3.62753 10.6667 4.13623 10.6667 4.66667C10.6667 5.1971 10.456 5.70581 10.0809 6.08088C9.70581 6.45595 9.1971 6.66667 8.66667 6.66667ZM4.66667 12C4.13623 12 3.62753 11.7893 3.25245 11.4142C2.87738 11.0391 2.66667 10.5304 2.66667 10C2.66667 9.46957 2.87738 8.96086 3.25245 8.58579C3.62753 8.21071 4.13623 8 4.66667 8C5.1971 8 5.70581 8.21071 6.08088 8.58579C6.45595 8.96086 6.66667 9.46957 6.66667 10C6.66667 10.5304 6.45595 11.0391 6.08088 11.4142C5.70581 11.7893 5.1971 12 4.66667 12ZM12 0C8.8174 0 5.76516 1.26428 3.51472 3.51472C1.26428 5.76516 0 8.8174 0 12C0 15.1826 1.26428 18.2348 3.51472 20.4853C5.76516 22.7357 8.8174 24 12 24C12.5304 24 13.0391 23.7893 13.4142 23.4142C13.7893 23.0391 14 22.5304 14 22C14 21.48 13.8 21.0133 13.48 20.6667C13.1733 20.3067 12.9733 19.84 12.9733 19.3333C12.9733 18.8029 13.184 18.2942 13.5591 17.9191C13.9342 17.544 14.4429 17.3333 14.9733 17.3333H17.3333C19.1014 17.3333 20.7971 16.631 22.0474 15.3807C23.2976 14.1305 24 12.4348 24 10.6667C24 4.77333 18.6267 0 12 0Z" />
                <defs>
                    <linearGradient id="logo-gradient" x1="0" y1="12" x2="24" y2="12" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#912381" />
                        <stop offset="0.33" stopColor="#CD186D" />
                        <stop offset="0.66" stopColor="#EA2634" />
                        <stop offset="1" stopColor="#F95535" />
                    </linearGradient>
                </defs>
            </svg>
        </button>
    )

    const fonts = (
        <button className={className.fonts} style={{ border: 'none' }} data-tooltip-content={`${logo}`.toUpperCase()}
            data-tooltip-id="logo-tooltip" id='fonts' onClick={handleLogoClick}>
            <svg id='fonts' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <g clipPath="url(#clip0_155_76)">
                    <path id='fonts' fillRule="evenodd"
                        clipRule="evenodd"
                        d="M1.6 0C0.717333 0 0 0.717333 0 1.6V22.4C0 23.2827 0.717333 24 1.6 24H22.4C23.2827 24 24 23.2827 
                  24 22.4V1.6C24 0.717333 23.2827 0 22.4 0H1.6ZM5.33333 4C4.59733 4 4 4.59733 4 5.33333V7.46667C4 8.20267 
                  4.59733 8.8 5.33333 8.8C6.06933 8.8 6.66667 8.20267 6.66667 7.46667V6.66667H10.6667V17.3333H10.1333C9.39733 
                  17.3333 8.8 17.9307 8.8 18.6667C8.8 19.4027 9.39733 20 10.1333 20H13.8667C14.6027 20 15.2 19.4027 15.2 18.6667C15.2 
                  17.9307 14.6027 17.3333 13.8667 17.3333H13.3333V6.66667H17.3333V7.46667C17.3333 8.20267 17.9307 8.8 18.6667 8.8C19.4027 
                  8.8 20 8.20267 20 7.46667V5.33333C20 4.59733 19.4027 4 18.6667 4H5.33333Z" />
                </g>
                <defs>
                    <clipPath id="clip0_155_76">
                        <rect width="24" height="24" fill="white" />
                    </clipPath>
                </defs>
                <defs>
                    <linearGradient id="logo-gradient" x1="0" y1="12" x2="24" y2="12" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#912381" />
                        <stop offset="0.33" stopColor="#CD186D" />
                        <stop offset="0.66" stopColor="#EA2634" />
                        <stop offset="1" stopColor="#F95535" />
                    </linearGradient>
                </defs>
            </svg>
        </button>
    )

    const images = (
        <button
            className={className.images}
            style={{ border: 'none' }}
            data-tooltip-id="logo-tooltip"
            data-tooltip-content={`${logo}`.toUpperCase()}
            id='images'
            onClick={handleLogoClick}>
            <svg id='images' xmlns="http://www.w3.org/2000/svg" width="24" height="21" viewBox="0 0 24 21" fill="none">
                <path id='images' d="M0.857143 20.5714C0.629814 20.5714 0.411797 20.4811 0.251051 20.3204C0.0903058 20.1596 0 19.9416 0 
                19.7143V0.857143C0 0.629814 0.0903058 0.411797 0.251051 0.251051C0.411797 0.090306 0.629814 0 0.857143 0H23.1429C23.3702
                 0 23.5882 0.090306 23.7489 0.251051C23.9097 0.411797 24 0.629814 24 0.857143V19.7143C24 19.9416 23.9097 20.1596 23.7489 
                 20.3204C23.5882 20.4811 23.3702 20.5714 23.1429 20.5714H0.857143ZM9.30857 14.4514L7.46229 12.6051C7.30155 12.4445 7.08357 
                 12.3542 6.85629 12.3542C6.629 12.3542 6.41102 12.4445 6.25029 12.6051L1.71429 17.1446H22.572L16.0869 9.36171C16.0064 
                 9.26495 15.9057 9.18709 15.7917 9.13364C15.6778 9.0802 15.5535 9.0525 15.4277 9.0525C15.3019 9.0525 15.1776 9.0802 
                 15.0637 9.13364C14.9498 9.18709 14.849 9.26495 14.7686 9.36171L10.5737 14.3949C10.4974 14.4864 10.4029 14.561 10.2961 
                 14.6139C10.1893 14.6669 10.0727 14.697 9.95363 14.7023C9.83457 14.7076 9.71572 14.6881 9.60465 14.6449C9.49358 14.6017 
                 9.39274 14.5358 9.30857 14.4514ZM5.14286 6.85714C5.14297 7.19494 5.20962 7.52941 5.33899 7.84145C5.46836 8.15349 5.65793 
                 8.43699 5.89687 8.67577C6.13581 8.91455 6.41944 9.10393 6.73156 9.2331C7.04369 9.36226 7.3782 9.42868 7.716 9.42857C8.0538 
                 9.42846 8.38827 9.36181 8.70031 9.23244C9.01235 9.10307 9.29585 8.9135 9.53463 8.67456C9.77341 8.43562 9.96279 8.15199 10.092 
                 7.83987C10.2211 7.52774 10.2875 7.19323 10.2874 6.85543C10.2872 6.17322 10.016 5.51904 9.53342 5.0368C9.05086 4.55456 8.3965 
                 4.28377 7.71429 4.284C7.03207 4.28423 6.37789 4.55545 5.89566 5.03801C5.41342 5.52057 5.14263 6.17493 5.14286 6.85714Z" />
                <defs>
                    <linearGradient id="logo-gradient" x1="0" y1="12" x2="24" y2="12" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#912381" />
                        <stop offset="0.33" stopColor="#CD186D" />
                        <stop offset="0.66" stopColor="#EA2634" />
                        <stop offset="1" stopColor="#F95535" />
                    </linearGradient>
                </defs>
            </svg>
        </button>
    )

    const no_images = (
        <svg xmlns="http://www.w3.org/2000/svg" width="33" height="33" viewBox="0 0 33 33" fill="none">
            <g clipPath="url(#clip0_163_105)">
                <path d="M28.91 4.93001C28.42 3.88001 27.37 3.22001 26.21 3.21001H6.20996C4.54996 3.21001 3.20996 4.55001 3.20996 6.21001V26.21C3.20996 27.37 3.87996 28.42 4.92996 28.91L6.62996 27.21H6.20996C5.65996 27.21 5.20996 26.76 5.20996 26.21V16.47L5.47996 16.35C7.04996 15.91 8.73996 16.35 9.88996 17.5L13.12 20.73L14.54 19.31L11.31 16.08C9.70996 14.5 7.39996 13.85 5.20996 14.37V6.21001C5.20996 5.66001 5.65996 5.21001 6.20996 5.21001H26.21C26.76 5.21001 27.21 5.66001 27.21 6.21001V6.63001L28.91 4.93001ZM27.21 9.46001V23.46L23.29 19.54C21.65 17.98 19.11 17.89 17.37 19.33L14.54 22.16L14.65 22.27L14.8 22.42C15.11 22.69 15.52 22.83 15.93 22.83C16.33 22.83 16.72 22.69 17.03 22.45L17.21 22.21L18.43 20.99C19.42 20.05 20.98 20.05 21.97 20.99L26.97 25.99C26.67 26.7 25.98 27.18 25.21 27.21H9.45996L7.45996 29.21H25.21C27.42 29.21 29.21 27.42 29.21 25.21V7.46001L27.21 9.46001Z" fill="#444444" />
                <path d="M20.71 7.21001C18.22 7.21001 16.21 9.23001 16.21 11.71C16.21 13.26 17.01 14.69 18.32 15.52L19.8 14.04C18.51 13.54 17.88 12.09 18.38 10.8C18.88 9.51001 20.33 8.88001 21.62 9.38001C22.27 9.63001 22.78 10.15 23.04 10.8L24.52 9.32001C23.7 8.01001 22.26 7.21001 20.71 7.21001ZM25.21 11.47L20.47 16.21H20.71C23.19 16.21 25.2 14.19 25.21 11.71C25.21 11.63 25.21 11.55 25.21 11.47Z" fill="#444444" />
                <path d="M31.0071 0.00310942L0.00756836 31.0027L1.42178 32.4169L32.4213 1.41732L31.0071 0.00310942Z" fill="#444444" />
            </g>
            <defs>
                <clipPath id="clip0_163_105">
                    <rect width="32.41" height="32.41" fill="white" />
                </clipPath>
            </defs>
        </svg>
    )

    const info = (
        <button 
        className={className.info} 
        style={{ border: 'none' }} 
        data-tooltip-content={`${logo}`.toUpperCase()}
        data-tooltip-id="logo-tooltip" 
        id='info'
        onClick={handleLogoClick}>
            <svg id='info' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path id='info' d="M12 0C5.37252 0 0 5.37252 0 12C0 18.6275 5.37252 24 12 24C18.6275 24 24 18.6275 24 12C24 5.37252 18.6275 0 12 0ZM11.7504 4.31672C12.592 4.31672 13.3043 5.00718 13.3043 5.87014C13.3043 6.73311 12.5922 7.42356 11.7504 7.42356C10.9086 7.42356 10.1977 6.73311 10.1977 5.87014C10.1977 5.00718 10.9095 4.31672 11.7504 4.31672ZM15.2241 18.8789H8.90311V17.4551H9.89519C10.4995 17.4551 10.7586 17.2178 10.7586 16.5921V11.0693C10.7586 10.4436 10.4995 10.2063 9.89519 10.2063H8.90311V8.78225H13.3043V16.5919C13.3043 17.2176 13.5634 17.4549 14.167 17.4549H15.2241V18.8787V18.8789Z" />
            <defs>
                <linearGradient id="logo-gradient" x1="0" y1="12" x2="24" y2="12" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#912381" />
                    <stop offset="0.33" stopColor="#CD186D" />
                    <stop offset="0.66" stopColor="#EA2634" />
                    <stop offset="1" stopColor="#F95535" />
                </linearGradient>
            </defs>
        </svg>
        </button>
    )

    const settings = (
        <button 
        className={className.settings} 
        style={{ border: 'none' }} 
        data-tooltip-content={`${logo}`.toUpperCase()}
        data-tooltip-id="logo-tooltip" 
        id='settings' 
        onClick={handleLogoClick}>
            <svg id='settings' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path id='settings' d="M23.2934 9.66562L20.6183 9.21136C20.4669 8.73186 20.265 8.2776 20.0379 7.82334L21.6025 5.62776C21.8297 5.29968 21.8044 4.84543 21.5268 4.56782L19.3817 2.42271C19.1041 2.14511 18.6498 2.09464 18.3218 2.347L16.1262 3.91167C15.6972 3.68454 15.2177 3.48265 14.7382 3.33123L14.3091 0.681388C14.2334 0.277603 13.9054 0 13.5016 0H10.4732C10.0694 0 9.74133 0.277603 9.66562 0.681388L9.21136 3.35647C8.73186 3.50789 8.2776 3.70978 7.82334 3.93691L5.62776 2.37224C5.29968 2.14511 4.84543 2.17035 4.56782 2.44795L2.42271 4.59306C2.14511 4.87066 2.09464 5.32492 2.347 5.653L3.91167 7.84858C3.68454 8.2776 3.48265 8.7571 3.33123 9.23659L0.681388 9.66562C0.277603 9.74133 0 10.0694 0 10.4732V13.5016C0 13.9054 0.277603 14.2334 0.681388 14.3091L3.35647 14.7634C3.50789 15.2429 3.70978 15.6972 3.93691 16.1514L2.37224 18.347C2.14511 18.6751 2.17035 19.1293 2.44795 19.4069L4.59306 21.5521C4.87066 21.8297 5.32492 21.8801 5.653 21.6278L7.84858 20.0631C8.2776 20.2902 8.7571 20.4921 9.23659 20.6435L9.69085 23.3186C9.76656 23.7224 10.0946 24 10.4984 24H13.5268C13.9306 24 14.2587 23.7224 14.3344 23.3186L14.7634 20.6183C15.2429 20.4669 15.6972 20.265 16.1514 20.0379L18.347 21.6025C18.6751 21.8297 19.1293 21.8044 19.4069 21.5268L21.5521 19.3817C21.8297 19.1041 21.8801 18.6498 21.6278 18.3218L20.0631 16.1262C20.2902 15.6972 20.4921 15.2177 20.6435 14.7382L23.3186 14.2839C23.7224 14.2082 24 13.8801 24 13.4763V10.4732C23.9748 10.0694 23.6972 9.74133 23.2934 9.66562ZM11.9874 16.3028C9.58991 16.3028 7.67192 14.3596 7.67192 11.9874C7.67192 9.61514 9.61514 7.67192 11.9874 7.67192C14.3596 7.67192 16.3028 9.58991 16.3028 11.9874C16.3028 14.3849 14.3849 16.3028 11.9874 16.3028Z" />
                <defs>
                    <linearGradient id="logo-gradient" x1="0" y1="12" x2="24" y2="12" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#912381" />
                        <stop offset="0.33" stopColor="#CD186D" />
                        <stop offset="0.66" stopColor="#EA2634" />
                        <stop offset="1" stopColor="#F95535" />
                    </linearGradient>
                </defs>
            </svg>
        </button>
    )

    const getLogo = (logo) => {
        return {
            colors,
            fonts,
            images,
            header,
            link,
            download,
            download_icon,
            no_images,
            settings,
            info
        }[logo]
    }

    return (
        <>
            {getLogo(logo)}
            <Tooltip id="logo-tooltip" positionStrategy="fixed" style={{ zIndex: 1000 }} place={toolTipPlace} />
        </>
    )
}