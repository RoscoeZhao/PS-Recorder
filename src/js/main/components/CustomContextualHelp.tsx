import { Content, ContextualHelp, Footer, Heading } from "@adobe/react-spectrum";

export default function CustomContextualHelp(props: any) {
  return (
    <ContextualHelp
      {...props}
      containerPadding={4}
    >
      <Heading UNSAFE_style={{fontSize: "medium"}}>
        {props.heading}
      </Heading>
      <Content UNSAFE_style={{whiteSpace: "pre-line", fontSize: "small"}}>
        {props.content}
      </Content>
      <Footer>
        {props.footer}
      </Footer>
    </ContextualHelp>
  );
}
