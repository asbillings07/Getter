import React from 'react'
import { useGetterContext } from '../Store'
import { ViewHeader } from '../components/Header'

export const SupportView = () => {
  const SUPPORT = 'support'
  const { propName } = useGetterContext()

  const shouldRender = SUPPORT === propName

  const Link = ({ href, text, children }) => {
    return <a href={href} target='_blank'>{text}{children}</a>
  }

  const TextContent = () => {
    return (
      <>
        Contact us by email at <Link href='cssgetter@gmail.com' text='cssgetter@gmail.com' /> for further support, feedback, or suggestions.
      </>
    )
  }

  const CreateSupportContent = ({ heading, content, buttonText, link, child }) => {
    return (
      <div className='support-content-container'>
        <h2>
          {heading}
        </h2>
        <p>
          {content}
        </p>
        <Link href={link} children={<button>{buttonText}</button>} />
      </div>
    )
  }

  return shouldRender && (
    <div className='support-container'>
      <ViewHeader title={SUPPORT.toUpperCase()} />
      <CreateSupportContent
        heading='Documentation'
        content='For more information on how to use CSS Getter, visit our website and read the extension documentation.'
        buttonText='read documentation'
        link='https://cssgetter.com'
      />
      <CreateSupportContent
        heading='Support'
        content={<TextContent />}
        buttonText='send us an email'
        link='mailto:cssgetter@gmail.com'
      />
      <div className='support-content-bottom'>
        <div><b>CSS Getter</b> is developed by <Link href='https://aaronbillings.com' text='Aaron Billings' /> and designed by <Link href='https://akbgraphicdesign.com' text='Amanda Billings' />.</div>
        <div> <Link href={'https://chromewebstore.google.com/detail/getter/nkgabfmcijbajgobbeloaobhbhpacnim'} text={'Leave a review'} /> | <Link href={'https://cssgetter.com'} text={'Visit CSS Getter website'} /></div>
      </div>
    </div>
  )
}
